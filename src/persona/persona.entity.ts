import { Entity, Property, ManyToOne, Rel } from "@mikro-orm/core";
import { BaseEntity } from "../shared/db/baseEntity.entity.js";
//import { PersonaClass } from "./personaClass.entity.js";

@Entity()
export class Persona extends BaseEntity {
  @Property({ nullable: false })
  name!: string;

  /* @ManyToOne(() => PersonaClass, { nullable: false })
    personaClass!: Rel<PersonaClass> */

  @Property({ nullable: false })
  lastname!: string;

  @Property({ nullable: false })
  dni!: number;

  @Property({ nullable: false })
  phone!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  password!: string;

  @Property()
  rol: string = 'cliente'; // Por defecto todos son clientes

  @Property({ nullable: true })
  recoverToken?: string;

  @Property({ nullable: true })
  recoverTokenExpires?: Date;
}
