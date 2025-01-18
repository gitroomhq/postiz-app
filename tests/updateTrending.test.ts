import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import { HttpException } from '@nestjs/common';

// Mock das dependências
jest.mock('@gitroom/nestjs-libraries/database/prisma/stars/stars.repository');
jest.mock('@gitroom/nestjs-libraries/database/prisma/notifications/notification.service');
jest.mock('@gitroom/nestjs-libraries/bull-mq-transport-new/client');

const mockStarsRepository = {
  getTrendingByLanguage: jest.fn(),
};

const mockNotificationService = {
  inform: jest.fn(),
};

const mockReplaceOrAddTrending = jest.fn();

class YourService {
  private _starsRepository;
  private notificationService;
  private replaceOrAddTrending;

  constructor(
    _starsRepository: any,
    notificationService: any,
    replaceOrAddTrending: any
  ) {
    this._starsRepository = _starsRepository;
    this.notificationService = notificationService;
    this.replaceOrAddTrending = replaceOrAddTrending;
  }

  async updateTrending(
    language: string,
    hash: string,
    arr: Array<{ name: string; position: number }>
  ) {
    const currentTrending = await this._starsRepository.getTrendingByLanguage(language);

    if (currentTrending?.hash === hash) {
      return;
    }

    if (currentTrending) {
      const list: Array<{ name: string; position: number }> = JSON.parse(
        currentTrending.trendingList
      );
      const removedFromTrending = list.filter(
        (p) => !arr.find((a) => a.name === p.name)
      );
      const changedPosition = arr.filter((p) => {
        const current = list.find((a) => a.name === p.name);
        return current && current.position !== p.position;
      });
      if (removedFromTrending.length) {
        await this.notificationService.inform(Inform.Removed, removedFromTrending, language);
      }
      if (changedPosition.length) {
        await this.notificationService.inform(Inform.Changed, changedPosition, language);
      }
    }

    const informNewPeople = arr.filter(
      (p) => !currentTrending?.trendingList || currentTrending?.trendingList.indexOf(p.name) === -1
    );

    await this.notificationService.inform(Inform.New, informNewPeople, language);
    await this.replaceOrAddTrending(language, hash, arr);
  }
}

describe('updateTrending', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService(
      mockStarsRepository,
      mockNotificationService,
      mockReplaceOrAddTrending
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('CT1: Teste com data vazio', async () => {
    const data: Array<{ name: string; position: number }> = [];

    await service.updateTrending('en', 'hash1', data);

    expect(mockStarsRepository.getTrendingByLanguage).not.toHaveBeenCalled();
    expect(mockNotificationService.inform).not.toHaveBeenCalled();
    expect(mockReplaceOrAddTrending).not.toHaveBeenCalled();
  });

  test('CT2: Teste com data válida e valores corretos', async () => {
    const data: Array<{ name: string; position: number }> = [
      { name: 'item1', position: 5 },
      { name: 'item2', position: 3 },
    ];

    mockStarsRepository.getTrendingByLanguage.mockResolvedValue({
      hash: 'hash1',
      trendingList: JSON.stringify([{ name: 'item3', position: 6 }]),
    });

    await service.updateTrending('en', 'hash2', data);

    expect(mockStarsRepository.getTrendingByLanguage).toHaveBeenCalledWith('en');
    expect(mockNotificationService.inform).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Array),
      'en'
    );
    expect(mockReplaceOrAddTrending).toHaveBeenCalledWith('en', 'hash2', data);
  });

  test('CT3: Teste com data contendo valores inválidos', async () => {
    const data: Array<{ name: string; position: number }> = [
      { name: 'item1', position: Number('string') }, // Garantir que seja número
      { name: 'item2', position: 3 },
    ];

    mockStarsRepository.getTrendingByLanguage.mockResolvedValue({
      hash: 'hash1',
      trendingList: JSON.stringify([{ name: 'item3', position: 6 }]),
    });

    await service.updateTrending('en', 'hash2', data);

    expect(mockStarsRepository.getTrendingByLanguage).toHaveBeenCalled();
    expect(mockNotificationService.inform).not.toHaveBeenCalled();
    expect(mockReplaceOrAddTrending).not.toHaveBeenCalled();
  });

  test('CT4: Teste com dados válidos, garantindo a chamada de saveTrending', async () => {
    const data: Array<{ name: string; position: number }> = [
      { name: 'item1', position: 5 },
      { name: 'item2', position: 3 },
      { name: 'item3', position: 7 },
    ];

    mockStarsRepository.getTrendingByLanguage.mockResolvedValue({
      hash: 'hash1',
      trendingList: JSON.stringify([{ name: 'item3', position: 6 }]),
    });

    await service.updateTrending('en', 'hash2', data);

    expect(mockStarsRepository.getTrendingByLanguage).toHaveBeenCalled();
    expect(mockNotificationService.inform).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Array),
      'en'
    );
    expect(mockReplaceOrAddTrending).toHaveBeenCalledWith('en', 'hash2', data);
  });
});
