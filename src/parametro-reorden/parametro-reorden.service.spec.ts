import { Test, TestingModule } from '@nestjs/testing';
import { ParametroReordenService } from './parametro-reorden.service';

describe('ParametroReordenService', () => {
  let service: ParametroReordenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParametroReordenService],
    }).compile();

    service = module.get<ParametroReordenService>(ParametroReordenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
