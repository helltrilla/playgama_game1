import { describe, it, expect } from 'vitest';
import { audio } from '../../src/audio/audio';

describe('AC-PG-5: VolumeController rules', () => {
  it('audio is muted if any flag is set (manualMute, platformMuted, paused, ad)', () => {
    audio.set('manualMute', false);
    audio.set('platformMuted', false);
    audio.set('paused', false);
    audio.set('ad', false);
    expect(audio.audible).toBe(true);

    // Platform muted (isAudioEnabled === false)
    audio.set('platformMuted', true);
    expect(audio.audible).toBe(false);

    // Reset platform, but pause game
    audio.set('platformMuted', false);
    audio.set('paused', true);
    expect(audio.audible).toBe(false);

    // Unpause, but ad playing
    audio.set('paused', false);
    audio.set('ad', true);
    expect(audio.audible).toBe(false);

    // Un-ad, but manual mute
    audio.set('ad', false);
    audio.set('manualMute', true);
    expect(audio.audible).toBe(false);

    // All clear -> sound on
    audio.set('manualMute', false);
    expect(audio.audible).toBe(true);
  });
});
