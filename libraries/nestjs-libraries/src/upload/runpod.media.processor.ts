import {
  IMediaProcessor,
  MediaProcessorJob,
  MediaProcessorResult,
  MediaProcessorStatus,
} from './media.processor.interface';

// RunPod Serverless wraps every request as { input } and every result as
// { id, status, output }. The worker returns failures as a normal result with
// status "failed" inside, so a RunPod-level FAILED is only an unhandled crash.
// Every job type of the service shares that envelope, so the endpoint decides
// what the job and result look like.
export class RunPodMediaProcessor<
  Job = MediaProcessorJob,
  Result = MediaProcessorResult
> implements IMediaProcessor<Job, Result>
{
  private _baseUrl: string;

  constructor(private _apiKey: string, endpointId: string) {
    this._baseUrl = `https://api.runpod.ai/v2/${endpointId}`;
  }

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(`${this._baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(
        `RunPod ${response.status}: ${(await response.text()).slice(0, 500)}`
      );
    }

    return response.json();
  }

  async submit(job: Job): Promise<string> {
    const { id } = await this.request('/run', {
      method: 'POST',
      body: JSON.stringify({ input: job }),
    });

    if (!id) {
      throw new Error('RunPod accepted the job without returning an id');
    }

    return id;
  }

  async status(jobId: string): Promise<MediaProcessorStatus<Result>> {
    const { status, output, error } = await this.request(`/status/${jobId}`, {
      method: 'GET',
    });

    switch (status) {
      case 'COMPLETED':
        return { status: 'completed', result: output };
      case 'FAILED':
      case 'CANCELLED':
      case 'TIMED_OUT':
        return { status: 'failed', error: error || status };
      default:
        return { status: 'pending' };
    }
  }
}
