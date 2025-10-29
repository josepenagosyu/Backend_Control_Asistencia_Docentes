import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, sparse: true })
  cedula: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  telefono: string;

  @Prop()
  departamento: string;

  @Prop()
  tituloAcademico: string;

  @Prop({ required: true, enum: ['docente', 'administrador'], default: 'docente' })
  rol: string;

  @Prop({ unique: true, sparse: true })
  username: string;

  @Prop()
  password: string;

  @Prop({ default: true })
  activo: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);