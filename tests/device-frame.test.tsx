import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceFrame } from '@/components/DeviceFrame';

/**
 * Regressietest bij bevinding K1.
 *
 * De wrapper had `width: device.width` én `maxWidth: '100%'`. De tweede wint,
 * dus het iframe kromp mee met het venster: op 1280px scherm was "Desktop
 * 1440px" werkelijk 1070px breed terwijl het onderschrift 1440 bleef beweren.
 * Je zag een andere indeling dan het label aangaf.
 *
 * happy-dom rekent geen layout uit, dus `clientWidth` is altijd 0. We zetten de
 * beschikbare breedte daarom zelf, precies zoals een browser hem zou meten.
 */
let beschikbareBreedte = 0;
let originalClientWidth: PropertyDescriptor | undefined;

beforeEach(() => {
  originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return beschikbareBreedte;
    },
  });
});

afterEach(() => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  }
  beschikbareBreedte = 0;
});

const iframe = () => screen.getByTitle('preview') as HTMLIFrameElement;

/** De breedte die de BROWSER aan het iframe geeft — dus vóór de transform. */
const layoutBreedte = (el: HTMLIFrameElement) => Number.parseFloat(el.style.width);

/** De schaalfactor uit de transform, of 1 als er niet geschaald wordt. */
const schaal = (el: HTMLIFrameElement) => {
  const match = /scale\(([\d.]+)\)/.exec(el.style.transform);
  return match ? Number.parseFloat(match[1]) : 1;
};

describe('de responsive preview', () => {
  it('geeft het iframe de volle apparaatbreedte als die past', () => {
    beschikbareBreedte = 1600;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    expect(layoutBreedte(iframe())).toBe(1440);
    expect(schaal(iframe())).toBe(1);
  });

  it('houdt de layoutbreedte op 1440 ook als het venster smaller is', () => {
    beschikbareBreedte = 1070;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    // Dit is de kern van de fout: de breedte mág niet meekrimpen met het scherm.
    expect(layoutBreedte(iframe())).toBe(1440);
    expect(schaal(iframe())).toBeCloseTo(1070 / 1440, 3);
  });

  it('vertelt in het onderschrift dat er verkleind wordt, met het percentage', () => {
    beschikbareBreedte = 720;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    // 720 / 1440 = 50%
    expect(document.body.textContent).toContain('1440');
    expect(document.body.textContent).toContain('op 50% weergegeven');
  });

  it('zegt "op ware grootte" als er niets geschaald wordt', () => {
    beschikbareBreedte = 1600;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    expect(document.body.textContent).toContain('op ware grootte');
    expect(document.body.textContent).not.toContain('weergegeven omdat');
  });

  it('vergroot nooit: een klein apparaat blijft klein op een breed scherm', () => {
    beschikbareBreedte = 1600;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    fireEvent.click(screen.getByRole('button', { name: /Mobiel/ }));
    expect(layoutBreedte(iframe())).toBe(390);
    expect(schaal(iframe())).toBe(1);
  });

  it('herberekent de schaal als je van apparaat wisselt', () => {
    beschikbareBreedte = 600;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    expect(schaal(iframe())).toBeCloseTo(600 / 1440, 3);
    fireEvent.click(screen.getByRole('button', { name: /Tablet/ }));
    expect(layoutBreedte(iframe())).toBe(834);
    expect(schaal(iframe())).toBeCloseTo(600 / 834, 3);
    fireEvent.click(screen.getByRole('button', { name: /Mobiel/ }));
    expect(layoutBreedte(iframe())).toBe(390);
    expect(schaal(iframe())).toBe(1);
  });

  it('verdwijnt niet als de breedte nog niet te meten is', () => {
    beschikbareBreedte = 0; // layout nog niet uitgevoerd
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    expect(layoutBreedte(iframe())).toBe(1440);
    expect(schaal(iframe())).toBe(1);
  });

  it('laadt elk apparaat als eigen document, zodat media-queries opnieuw gelden', () => {
    beschikbareBreedte = 1600;
    render(<DeviceFrame src="/render?x=1" title="preview" />);
    const voor = iframe();
    fireEvent.click(screen.getByRole('button', { name: /Mobiel/ }));
    // Door de `key` per apparaat maakt React een nieuw iframe-element aan.
    expect(iframe()).not.toBe(voor);
  });
});
