import { describe, expect, it } from 'vitest';
import { parseCSOPath } from './CSOBriefRouteHost';

describe('parseCSOPath', () => {
  it('parses edit and view deep links', () => {
    expect(parseCSOPath('/cso-briefs/abc-123/edit')).toEqual({ briefId: 'abc-123', mode: 'edit' });
    expect(parseCSOPath('/cso-briefs/abc-123/view')).toEqual({ briefId: 'abc-123', mode: 'view' });
  });

  it('rejects invalid routes', () => {
    expect(parseCSOPath('/cso-briefs/abc-123')).toBeNull();
    expect(parseCSOPath('/vendors')).toBeNull();
  });
});
