import { describe, it, expect } from 'vitest';
import {
  TACTILE_PROPS,
  ROLE_TO_PROP,
  getPropForRole,
  ALL_PROP_IDS,
} from './tactileProps';

describe('TACTILE_PROPS registry', () => {
  it('contains exactly the five expected props', () => {
    expect(ALL_PROP_IDS).toHaveLength(5);
    expect(ALL_PROP_IDS).toEqual(
      expect.arrayContaining(['lantern', 'journal', 'specimenJar', 'mailbox', 'tent'])
    );
  });

  it('every prop has a non-empty label', () => {
    for (const [id, cfg] of Object.entries(TACTILE_PROPS)) {
      expect(cfg.label, `${id}.label`).toBeTruthy();
    }
  });

  it('every prop has a non-empty ariaDescription', () => {
    for (const [id, cfg] of Object.entries(TACTILE_PROPS)) {
      expect(cfg.ariaDescription, `${id}.ariaDescription`).toBeTruthy();
    }
  });
});

describe('ROLE_TO_PROP mapping', () => {
  it('maps trailheadSign → tent', () => {
    expect(ROLE_TO_PROP.trailheadSign).toBe('tent');
  });
  it('maps stage → specimenJar', () => {
    expect(ROLE_TO_PROP.stage).toBe('specimenJar');
  });
  it('maps guide → lantern', () => {
    expect(ROLE_TO_PROP.guide).toBe('lantern');
  });
  it('maps mailbox → mailbox', () => {
    expect(ROLE_TO_PROP.mailbox).toBe('mailbox');
  });
  it('maps reflection → journal', () => {
    expect(ROLE_TO_PROP.reflection).toBe('journal');
  });
  it('does NOT map challenger (no prop)', () => {
    expect(ROLE_TO_PROP.challenger).toBeUndefined();
  });
  it('does NOT map bulletinSubmit (no prop)', () => {
    expect(ROLE_TO_PROP.bulletinSubmit).toBeUndefined();
  });
});

describe('getPropForRole', () => {
  it('returns the correct PropId for mapped roles', () => {
    expect(getPropForRole('guide')).toBe('lantern');
    expect(getPropForRole('reflection')).toBe('journal');
    expect(getPropForRole('mailbox')).toBe('mailbox');
  });

  it('returns null for unmapped roles', () => {
    expect(getPropForRole('challenger')).toBeNull();
    expect(getPropForRole('bulletinSubmit')).toBeNull();
    expect(getPropForRole('stretch')).toBeNull();
  });

  it('returns null for unknown roles', () => {
    expect(getPropForRole('nonsense')).toBeNull();
    expect(getPropForRole('')).toBeNull();
    expect(getPropForRole(undefined)).toBeNull();
  });
});
