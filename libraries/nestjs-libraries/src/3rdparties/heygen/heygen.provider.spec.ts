import { HeygenProvider } from './heygen.provider';

jest.mock('@gitroom/nestjs-libraries/openai/openai.service', () => ({
  OpenaiService: class {},
}));

jest.mock('@gitroom/helpers/utils/timer', () => ({
  timer: jest.fn(),
}));

describe('HeygenProvider', () => {
  describe('voices', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
      fetchMock.mockReset();
      global.fetch = fetchMock as unknown as typeof fetch;
    });

    it('returns the complete voice list from HeyGen', async () => {
      const voices = Array.from({ length: 25 }, (_, index) => ({
        voice_id: `voice-${index}`,
        name: `Voice ${index}`,
        language: index < 20 ? 'English' : 'Spanish',
      }));

      fetchMock.mockResolvedValue({
        json: async () => ({
          data: {
            voices,
          },
        }),
      });

      const provider = new HeygenProvider({} as any);

      await expect(provider.voices('api-key')).resolves.toHaveLength(25);
    });
  });
});
