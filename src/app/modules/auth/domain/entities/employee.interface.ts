/**
 * Información del empleado
 */
export interface IEmployee {
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
  departmentId?: number;
  positionId?: number;
  companyId?: number;
  businessUnitId?: number;
}
