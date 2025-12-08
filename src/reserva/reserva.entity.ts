import { Entity, Property, ManyToOne, Rel, PrimaryKey } from "@mikro-orm/core";
import { BaseEntity } from "../shared/db/baseEntity.entity.js";
import { Cancha } from "../cancha/cancha.entity.js";

@Entity()
export class Reserva extends BaseEntity {
  @Property({ nullable: false })
  fechaReserva!: string;

  @Property({ nullable: false })
  horaInicio!: string;

  @Property({ nullable: false })
  horaFin!: string;

  @Property({ nullable: false })
  totalReserva!: number;

  @Property({ nullable: false })
  mail_cliente!: string;

  @Property({ nullable: false })
  idCancha!: number;

  @Property({ nullable: false })
  idEmpleado!: number;

  /* @ManyToOne(() => Cancha, { nullable: true, fieldName: 'id_cancha' })
  cancha!: Cancha; */
}
