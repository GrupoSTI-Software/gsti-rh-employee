import { IEmployee } from './employee.interface';

/**
 * Información de la persona
 */
export interface IPerson {
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
  employee?: IEmployee;
}
