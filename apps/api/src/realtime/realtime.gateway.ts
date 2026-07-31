import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";

/**
 * Replaces Supabase Realtime (01_SHARED_FOUNDATIONS §1 architecture update).
 * Same requirement it served: the rider app's "payment confirmed instantly,
 * no phone call" feature (04_PRD_Rider §3.2) and merchant/ops live status.
 * Clients join a room per delivery id after connecting; the server never
 * pushes anything a client didn't explicitly subscribe to.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      this.jwt.verify(token);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage("subscribe:delivery")
  handleSubscribeDelivery(client: Socket, deliveryId: string): void {
    client.join(`delivery:${deliveryId}`);
  }

  @SubscribeMessage("subscribe:ops")
  handleSubscribeOps(client: Socket): void {
    client.join("ops");
  }

  emitDeliveryUpdate(deliveryId: string, event: string, payload: unknown): void {
    this.server.to(`delivery:${deliveryId}`).emit(event, payload);
    this.server.to("ops").emit(event, { deliveryId, ...((payload as object) ?? {}) });
  }
}
