import { IsString, IsNotEmpty } from 'class-validator';
export class LoginDocenteDto {
  @IsString()
  @IsNotEmpty()
  numeroCedula: string;
}