import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IProfilePort,
  IEmployeeProfile,
  IProfileBusinessUnit,
  IProfileEmployeeType,
  IProfileEmergencyContact,
  IProfileMedicalCondition,
  IProfileRecordProperty,
  IProfileResponsible,
} from '../domain/profile.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Respuesta esperada del endpoint GET /employees/{id}
 */
interface IEmployeeProfileApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    employee: IEmployeeProfile;
  };
}

/**
 * Respuesta esperada del endpoint GET /business-units
 */
interface IBusinessUnitsApiResponse {
  status: number;
  data: {
    data: IProfileBusinessUnit[];
  };
}

/**
 * Respuesta esperada del endpoint GET /employee-types
 */
interface IEmployeeTypesApiResponse {
  status: number;
  data: {
    employeeTypes: {
      data: IProfileEmployeeType[];
    };
  };
}

/**
 * Respuesta esperada del endpoint GET /employee-emergency-contacts/employee/{id}
 */
interface IEmergencyContactsApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    employeeEmergencyContacts: IProfileEmergencyContact[];
  };
}

/**
 * Respuesta esperada del endpoint GET /employee-medical-conditions/employee/{id}
 */
interface IMedicalConditionsApiResponse {
  type: string;
  data: {
    employeeMedicalConditions: IProfileMedicalCondition[];
  };
}

/**
 * Respuesta esperada del endpoint GET /employee-record-properties/get-categories-by-employee
 */
interface IRecordCategoriesApiResponse {
  type: string;
  data: {
    employeeRecordCategories: Record<string, IProfileRecordProperty[]>;
  };
}

/**
 * Respuesta esperada del endpoint GET /employees/{id}/user-responsible/undefined
 */
interface IResponsiblesApiResponse {
  type: string;
  data: {
    data: {
      data: Array<{
        userResponsibleEmployeeId: number;
        userResponsibleEmployeeReadonly: number;
        userResponsibleEmployeeDirectBoss: number;
        user: {
          userId: number;
          userEmail: string;
          userActive: number;
          personId: number;
          person: {
            personFirstname: string;
            personLastname: string;
            personSecondLastname?: string;
          };
          role: { roleName: string };
        };
      }>;
    };
  };
}

/**
 * Respuesta esperada del endpoint GET /person-get-employee/{personId}
 */
interface IPersonGetEmployeeApiResponse {
  type: string;
  data: {
    employee: {
      employeeCode?: string;
      employeePhoto?: string;
      department?: { departmentName: string };
      position?: { positionName: string };
    } | null;
  };
}

/**
 * Adaptador HTTP para el perfil del empleado
 * Implementa el puerto IProfilePort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpProfileAdapter implements IProfilePort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene el perfil completo del empleado por su identificador.
   * El endpoint retorna person, department, position y businessUnit anidados.
   * Solo payrollBusinessUnit y employeeType se resuelven con llamadas paralelas adicionales.
   *
   * @param employeeId - Identificador único del empleado
   * @returns Promesa con el perfil del empleado compuesto o null si no existe
   */
  async getEmployeeProfile(employeeId: number): Promise<IEmployeeProfile | null> {
    try {
      const response = await firstValueFrom<IEmployeeProfileApiResponse>(
        this.http.get<IEmployeeProfileApiResponse>(`${this.apiUrl}/employees/${employeeId}`),
      );

      const employee = response.data?.employee;
      if (!employee) return null;

      const [
        businessUnits,
        employeeTypes,
        emergencyContacts,
        medicalConditions,
        recordCategories,
        responsibles,
      ] = await Promise.all([
        employee.payrollBusinessUnitId ? this.fetchBusinessUnits() : Promise.resolve([]),
        employee.employeeTypeId ? this.fetchEmployeeTypes() : Promise.resolve([]),
        this.fetchEmergencyContacts(employeeId),
        this.fetchMedicalConditions(employeeId),
        this.fetchRecordCategories(employeeId),
        this.fetchResponsibles(employeeId),
      ]);

      if (businessUnits.length > 0 && employee.payrollBusinessUnitId) {
        employee.payrollBusinessUnit =
          businessUnits.find((bu) => bu.businessUnitId === employee.payrollBusinessUnitId) ??
          undefined;
      }

      if (employeeTypes.length > 0 && employee.employeeTypeId) {
        employee.employeeType =
          employeeTypes.find((et) => et.employeeTypeId === employee.employeeTypeId) ?? undefined;
      }

      employee.emergencyContacts = emergencyContacts;
      employee.medicalConditions = medicalConditions;
      employee.recordCategories = recordCategories;
      employee.responsibles = responsibles;

      return employee;
    } catch (error: unknown) {
      this.logger.error('Error al obtener perfil del empleado:', error);

      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          this.logger.error(
            'Mensaje del API:',
            this.apiErrorTranslator.translateError(errorBody.message),
          );
        }
      }

      return null;
    }
  }

  /**
   * Obtiene la lista de unidades de negocio
   */
  private async fetchBusinessUnits(): Promise<IProfileBusinessUnit[]> {
    try {
      const response = await firstValueFrom<IBusinessUnitsApiResponse>(
        this.http.get<IBusinessUnitsApiResponse>(`${this.apiUrl}/business-units`),
      );
      return response.data?.data ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener unidades de negocio:', error);
      return [];
    }
  }

  /**
   * Obtiene la lista de tipos de empleado
   */
  private async fetchEmployeeTypes(): Promise<IProfileEmployeeType[]> {
    try {
      const response = await firstValueFrom<IEmployeeTypesApiResponse>(
        this.http.get<IEmployeeTypesApiResponse>(`${this.apiUrl}/employee-types`),
      );
      return response.data?.employeeTypes?.data ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener tipos de empleado:', error);
      return [];
    }
  }

  /**
   * Obtiene los contactos de emergencia del empleado
   *
   * @param employeeId - Identificador único del empleado
   */
  private async fetchEmergencyContacts(employeeId: number): Promise<IProfileEmergencyContact[]> {
    try {
      const response = await firstValueFrom<IEmergencyContactsApiResponse>(
        this.http.get<IEmergencyContactsApiResponse>(
          `${this.apiUrl}/employee-emergency-contacts/employee/${employeeId}`,
        ),
      );
      return response.data?.employeeEmergencyContacts ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener contactos de emergencia:', error);
      return [];
    }
  }

  /**
   * Obtiene las condiciones médicas del empleado
   *
   * @param employeeId - Identificador único del empleado
   */
  private async fetchMedicalConditions(employeeId: number): Promise<IProfileMedicalCondition[]> {
    try {
      const response = await firstValueFrom<IMedicalConditionsApiResponse>(
        this.http.get<IMedicalConditionsApiResponse>(
          `${this.apiUrl}/employee-medical-conditions/employee/${employeeId}`,
        ),
      );
      return response.data?.employeeMedicalConditions ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener condiciones médicas:', error);
      return [];
    }
  }

  /**
   * Obtiene las categorías de registros del empleado
   *
   * @param employeeId - Identificador único del empleado
   */
  private async fetchRecordCategories(
    employeeId: number,
  ): Promise<Record<string, IProfileRecordProperty[]>> {
    try {
      const response = await firstValueFrom<IRecordCategoriesApiResponse>(
        this.http.get<IRecordCategoriesApiResponse>(
          `${this.apiUrl}/employee-record-properties/get-categories-by-employee`,
          { params: { employeeId: employeeId.toString() } },
        ),
      );
      return response.data?.employeeRecordCategories ?? {};
    } catch (error: unknown) {
      this.logger.error('Error al obtener registros del empleado:', error);
      return {};
    }
  }

  /**
   * Obtiene los usuarios responsables del empleado.
   * Primero obtiene la lista de responsables y luego enriquece cada uno
   * con datos del empleado via person-get-employee.
   *
   * @param employeeId - Identificador único del empleado
   */
  private async fetchResponsibles(employeeId: number): Promise<IProfileResponsible[]> {
    try {
      const response = await firstValueFrom<IResponsiblesApiResponse>(
        this.http.get<IResponsiblesApiResponse>(
          `${this.apiUrl}/employees/${employeeId}/user-responsible/undefined`,
        ),
      );

      const items = response.data?.data?.data ?? [];
      if (items.length === 0) return [];

      const enriched = await Promise.all(
        items.map(async (item) => {
          const person = item.user?.person;
          const fullName = [
            person?.personFirstname,
            person?.personLastname,
            person?.personSecondLastname,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          const base: IProfileResponsible = {
            userResponsibleEmployeeId: item.userResponsibleEmployeeId,
            userResponsibleEmployeeReadonly: item.userResponsibleEmployeeReadonly,
            userResponsibleEmployeeDirectBoss: item.userResponsibleEmployeeDirectBoss,
            userEmail: item.user?.userEmail,
            userActive: item.user?.userActive,
            roleName: item.user?.role?.roleName,
            fullName: fullName || undefined,
          };

          const personId = item.user?.personId;
          if (personId) {
            const empData = await this.fetchPersonEmployee(personId);
            if (empData) {
              base.employeeCode = empData.employeeCode;
              base.employeePhoto = empData.employeePhoto;
              base.departmentName = empData.department?.departmentName;
              base.positionName = empData.position?.positionName;
            }
          }

          return base;
        }),
      );

      return enriched;
    } catch (error: unknown) {
      this.logger.error('Error al obtener responsables del empleado:', error);
      return [];
    }
  }

  /**
   * Obtiene los datos del empleado a partir del personId
   *
   * @param personId - Identificador de la persona
   */
  private async fetchPersonEmployee(personId: number): Promise<{
    employeeCode?: string;
    employeePhoto?: string;
    department?: { departmentName: string };
    position?: { positionName: string };
  } | null> {
    try {
      const response = await firstValueFrom<IPersonGetEmployeeApiResponse>(
        this.http.get<IPersonGetEmployeeApiResponse>(
          `${this.apiUrl}/person-get-employee/${personId}`,
        ),
      );
      return response.data?.employee ?? null;
    } catch (error: unknown) {
      this.logger.error(`Error al obtener empleado por personId ${personId}:`, error);
      return null;
    }
  }
}
