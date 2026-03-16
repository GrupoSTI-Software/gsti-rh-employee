/**
 * Información completa del perfil del empleado
 * Obtenida desde GET /employees/{id}
 */
export interface IEmployeeProfile {
  employeeId: number;
  employeeCode: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeSecondLastName?: string;
  employeePayrollCode?: string;
  employeeHireDate?: string;
  employeePhoto?: string;
  employeeWorkSchedule?: string;
  employeeTypeOfContract?: string;
  employeeBusinessEmail?: string;
  employeeAuthorizeAnyZones?: number;
  employeeAssistDiscriminator?: number;
  employeeIgnoreConsecutiveAbsences?: number;
  dailySalary?: string;
  departmentId?: number;
  positionId?: number;
  businessUnitId?: number;
  payrollBusinessUnitId?: number;
  employeeTypeId?: number;
  personId?: number;
  person?: IProfilePerson;
  department?: IProfileDepartment;
  position?: IProfilePosition;
  businessUnit?: IProfileBusinessUnit;
  payrollBusinessUnit?: IProfileBusinessUnit;
  employeeType?: IProfileEmployeeType;
  spouse?: IProfileSpouse;
  children?: IProfileChild[];
  emergencyContacts?: IProfileEmergencyContact[];
  medicalConditions?: IProfileMedicalCondition[];
  recordCategories?: Record<string, IProfileRecordProperty[]>;
  address?: IProfileEmployeeAddress[];
  responsibles?: IProfileResponsible[];
}

/**
 * Información de la persona asociada al perfil
 */
export interface IProfilePerson {
  personId: number;
  personFirstname: string;
  personLastname: string;
  personSecondLastname?: string;
  personPhone?: string;
  personEmail?: string;
  personPhoneSecondary?: string;
  personGender?: string;
  personBirthday?: string;
  personCurp?: string;
  personRfc?: string;
  personImssNss?: string;
  personMaritalStatus?: string;
  personPlaceOfBirthCountry?: string;
  personPlaceOfBirthState?: string;
  personPlaceOfBirthCity?: string;
}

/**
 * Departamento del empleado
 */
export interface IProfileDepartment {
  departmentId: number;
  departmentName: string;
}

/**
 * Posición/cargo del empleado
 */
export interface IProfilePosition {
  positionId: number;
  positionName: string;
}

/**
 * Unidad de negocio
 */
export interface IProfileBusinessUnit {
  businessUnitId: number;
  businessUnitName: string;
}

/**
 * Tipo de empleado
 */
export interface IProfileEmployeeType {
  employeeTypeId: number;
  employeeTypeName: string;
}

/**
 * Cónyuge del empleado
 */
export interface IProfileSpouse {
  employeeSpouseId: number;
  employeeSpouseFirstname: string;
  employeeSpouseLastname: string;
  employeeSpouseSecondLastname?: string;
  employeeSpouseOcupation?: string;
  employeeSpouseBirthday?: string;
  employeeSpousePhone?: string;
}

/**
 * Hijo del empleado
 */
export interface IProfileChild {
  employeeChildrenId: number;
  employeeChildrenFirstname: string;
  employeeChildrenLastname: string;
  employeeChildrenSecondLastname?: string;
  employeeChildrenGender?: string;
  employeeChildrenBirthday?: string;
}

/**
 * Tipo de condición médica
 */
export interface IProfileMedicalConditionType {
  medicalConditionTypeId: number;
  medicalConditionTypeName: string;
}

/**
 * Condición médica del empleado
 */
export interface IProfileMedicalCondition {
  employeeMedicalConditionId: number;
  medicalConditionTypeId: number;
  employeeMedicalConditionDiagnosis?: string;
  employeeMedicalConditionNotes?: string;
  employeeMedicalConditionActive?: number;
  medicalConditionType?: IProfileMedicalConditionType;
}

/**
 * Valor de un registro del empleado
 */
export interface IProfileRecordValue {
  employeeRecordValue: string;
  employeeRecordId: number;
}

/**
 * Propiedad de un registro del empleado dentro de una categoría
 */
export interface IProfileRecordProperty {
  name: string;
  type: string;
  values: IProfileRecordValue[];
  employeeRecordPropertyId: number;
}

/**
 * Dirección del empleado
 */
export interface IProfileAddress {
  addressId: number;
  addressZipcode?: string;
  addressCountry?: string;
  addressState?: string;
  addressTownship?: string;
  addressCity?: string;
  addressSettlement?: string;
  addressSettlementType?: string;
  addressStreet?: string;
  addressInternalNumber?: string;
  addressExternalNumber?: string;
  addressBetweenStreet1?: string;
  addressBetweenStreet2?: string;
}

/**
 * Relación dirección-empleado
 */
export interface IProfileEmployeeAddress {
  employeeAddressId: number;
  employeeId: number;
  addressId: number;
  address?: IProfileAddress;
}

/**
 * Usuario responsable del empleado (datos combinados de user-responsible y person-get-employee)
 */
export interface IProfileResponsible {
  userResponsibleEmployeeId: number;
  userResponsibleEmployeeReadonly: number;
  userResponsibleEmployeeDirectBoss: number;
  userEmail?: string;
  userActive?: number;
  roleName?: string;
  employeeCode?: string;
  employeePhoto?: string;
  fullName?: string;
  departmentName?: string;
  positionName?: string;
}

/**
 * Contacto de emergencia del empleado
 */
export interface IProfileEmergencyContact {
  employeeEmergencyContactId: number;
  employeeEmergencyContactFirstname: string;
  employeeEmergencyContactLastname: string;
  employeeEmergencyContactSecondLastname?: string;
  employeeEmergencyContactRelationship?: string;
  employeeEmergencyContactPhone?: string;
}
