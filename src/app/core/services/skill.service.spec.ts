import { of } from 'rxjs';
import { SkillService } from './skill.service';
import { ApiService } from './api.service';

describe('SkillService', () => {
  let service: SkillService;
  let apiService: jest.Mocked<Pick<ApiService, 'get' | 'post' | 'put' | 'delete' | 'createParams'>>;

  beforeEach(() => {
    apiService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      createParams: jest.fn().mockReturnValue('PARAMS'),
    } as unknown as jest.Mocked<typeof apiService>;

    service = new SkillService(apiService as unknown as ApiService);
  });

  it('maps registry DTOs to models with Date fields', done => {
    apiService.get.mockReturnValue(
      of([
        {
          id: 'r1',
          name: 'Hub',
          description: '',
          baseUrl: 'http://localhost:8080',
          authType: 'api_key',
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ])
    );

    service.getRegistries().subscribe(registries => {
      expect(apiService.get).toHaveBeenCalledWith('/skillregistries');
      expect(registries).toHaveLength(1);
      expect(registries[0].name).toBe('Hub');
      expect(registries[0].authType).toBe('api_key');
      expect(registries[0].createdAt).toBeInstanceOf(Date);
      done();
    });
  });

  it('proxies skill search through the registry endpoint', done => {
    apiService.get.mockReturnValue(
      of([
        {
          namespace: 'acme',
          skillSlug: 'pdf',
          version: '1.0.0',
          displayName: 'PDF',
          description: 'd',
        },
      ])
    );

    service.searchSkills('r1', 'pdf').subscribe(results => {
      expect(apiService.createParams).toHaveBeenCalledWith({ q: 'pdf' });
      expect(apiService.get).toHaveBeenCalledWith('/skillregistries/r1/search', 'PARAMS');
      expect(results[0].skillSlug).toBe('pdf');
      done();
    });
  });

  it('attaches a skill to an agent', done => {
    apiService.post.mockReturnValue(
      of({
        id: 's1',
        agentId: 'a1',
        skillRegistryId: 'r1',
        namespace: 'acme',
        skillSlug: 'pdf',
        version: '1.0.0',
        displayName: 'PDF',
        description: 'd',
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
      })
    );

    service
      .attachSkill('a1', {
        skillRegistryId: 'r1',
        namespace: 'acme',
        skillSlug: 'pdf',
        version: '1.0.0',
        displayName: 'PDF',
        description: 'd',
        isActive: true,
      })
      .subscribe(skill => {
        expect(apiService.post).toHaveBeenCalledWith(
          '/agents/a1/skills',
          expect.objectContaining({ skillSlug: 'pdf' })
        );
        expect(skill.id).toBe('s1');
        expect(skill.createdAt).toBeInstanceOf(Date);
        done();
      });
  });

  it('maps test-connection response to a boolean', done => {
    apiService.post.mockReturnValue(of({ success: true }));

    service.testRegistry('r1').subscribe(ok => {
      expect(apiService.post).toHaveBeenCalledWith('/skillregistries/r1/test', {});
      expect(ok).toBe(true);
      done();
    });
  });

  it('detaches a skill from an agent', done => {
    apiService.delete.mockReturnValue(of({}));

    service.detachSkill('a1', 's1').subscribe(result => {
      expect(apiService.delete).toHaveBeenCalledWith('/agents/a1/skills/s1');
      expect(result).toBe(true);
      done();
    });
  });
});
