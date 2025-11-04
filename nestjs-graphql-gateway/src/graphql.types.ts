import { ObjectType, Field, ID, Float, InputType } from '@nestjs/graphql';

@ObjectType()
export class Workspace {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field(() => [Bot])
  bots: Bot[];
}

@ObjectType()
export class Bot {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  workspaceId: string;

  @Field()
  name: string;

  @Field()
  modelProvider: string;

  @Field()
  modelName: string;

  @Field(() => Float, { nullable: true })
  temperature?: number;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field(() => [Document])
  documents: Document[];

  @Field(() => [ChatSession])
  sessions: ChatSession[];
}

@ObjectType()
export class Document {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  botId: string;

  @Field()
  filename: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field()
  status: string;

  @Field()
  chunkCount: number;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

@ObjectType()
export class ChatSession {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  botId: string;

  @Field({ nullable: true })
  userId?: string;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  @Field(() => [Message])
  messages: Message[];
}

@ObjectType()
export class Message {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sessionId: string;

  @Field()
  role: string;

  @Field()
  content: string;

  @Field(() => Float, { nullable: true })
  tokensUsed?: number;

  @Field()
  createdAt: string;
}

@ObjectType()
export class Citation {
  @Field(() => ID)
  documentId: string;

  @Field()
  filename: string;

  @Field(() => Float)
  score: number;
}

@ObjectType()
export class ChatResult {
  @Field()
  answer: string;

  @Field(() => [Citation])
  citations: Citation[];

  @Field()
  tokensUsed: number;
}

@ObjectType()
export class MessageConnection {
  @Field(() => [Message])
  edges: Message[];

  @Field({ nullable: true })
  nextCursor?: string;
}

@ObjectType()
export class IngestResult {
  @Field(() => ID)
  botId: string;

  @Field()
  upsertedEmbeddings: number;

  @Field()
  documents: number;
}

@InputType()
export class CreateBotInput {
  @Field(() => ID)
  workspaceId: string;

  @Field()
  name: string;

  @Field()
  modelProvider: string;

  @Field()
  modelName: string;

  @Field(() => Float, { nullable: true })
  temperature?: number;
}

@InputType()
export class DocumentInput {
  @Field()
  filename: string;

  @Field()
  text: string;
}

@InputType()
export class ChatInput {
  @Field(() => ID)
  sessionId: string;

  @Field()
  message: string;

  @Field(() => Float, { nullable: true })
  topK?: number;
}