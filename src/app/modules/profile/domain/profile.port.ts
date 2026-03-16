// Re-exportar interfaces directamente con sus nombres con prefijo I
export type { IProfilePort } from './entities/profile-port.interface';
export type {
  IEmployeeProfile,
  IProfilePerson,
  IProfileDepartment,
  IProfilePosition,
  IProfileBusinessUnit,
  IProfileEmployeeType,
  IProfileSpouse,
  IProfileChild,
  IProfileEmergencyContact,
  IProfileMedicalCondition,
  IProfileMedicalConditionType,
  IProfileRecordValue,
  IProfileRecordProperty,
  IProfileAddress,
  IProfileEmployeeAddress,
  IProfileResponsible,
} from './entities/employee-profile.interface';
