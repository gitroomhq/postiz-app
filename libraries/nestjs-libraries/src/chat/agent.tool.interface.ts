export interface AgentToolInterface {
  name: string;
  run(): Promise<any>;
}