import { describe, expect, it } from 'vitest';
import { parseCSOPath } from './CSOBriefRouteHost';

describe('parseCSOPath', () => {
  it('parses generate, edit and view deep links', () => {
    expect(parseCSOPath('/cso-briefs/generate')).toEqual({ mode: 'generate' });
    expect(parseCSOPath('/cso-briefs/abc-123/edit')).toEqual({ briefId: 'abc-123', mode: 'edit' });
    expect(parseCSOPath('/cso-briefs/abc-123/view')).toEqual({ briefId: 'abc-123', mode: 'view' });
  });

  it('rejects invalid routes', () => {
    expect(parseCSOPath('/cso-briefs/abc-123')).toBeNull();
    expect(parseCSOPath('/cso-briefs/generate/extra')).toBeNull();
    expect(parseCSOPath('/vendors')).toBeNull();
  });
});
