import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { Ticket } from './entities/ticket.entity';
import { TicketReply } from './entities/ticket-reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketReply])],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}
