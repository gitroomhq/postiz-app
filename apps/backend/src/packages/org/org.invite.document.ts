import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { OrgInviteStatus } from '@clickvote/interfaces';
import { Org } from "@clickvote/backend/src/packages/org/org.document";

export type OrgInviteDocument = HydratedDocument<OrgInvite>;

@Schema({ collection: 'org_invites' })
export class OrgInvite {
  @Prop({ index: true })
  email: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Org' })
  org: Org;

  @Prop({
    type: String,
    enum: OrgInviteStatus,
    default: OrgInviteStatus.PENDING
  })
  status: OrgInviteStatus;
}

export const OrgInviteSchema = SchemaFactory.createForClass(OrgInvite);