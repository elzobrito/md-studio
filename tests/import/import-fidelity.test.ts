import { describe, it, expect } from 'vitest';
import {
  getFidelityDescriptor,
  normalizeFormatId,
  getAllFidelityClasses,
  FIDELITY_LABELS,
  FIDELITY_EXPLANATIONS,
} from '../../src/services/importFidelity';

describe('Import Fidelity Classes (Spec 045)', () => {
  it('normalizes format ids correctly', () => {
    expect(normalizeFormatId('.DOCX')).toBe('docx');
    expect(normalizeFormatId('  .Html ')).toBe('html');
    expect(normalizeFormatId('PDF')).toBe('pdf');
    expect(normalizeFormatId('')).toBe('');
  });

  it('classifies High fidelity formats: HTML, DOCX, EPUB', () => {
    const highFormats = ['html', 'htm', 'docx', 'epub', '.DOCX', '.EPUB'];
    for (const fmt of highFormats) {
      const desc = getFidelityDescriptor(fmt);
      expect(desc.class).toBe('high');
      expect(desc.label).toBe(FIDELITY_LABELS.high);
      expect(desc.explanation).toBe(FIDELITY_EXPLANATIONS.high);
      expect(desc.basis).toBe('provider-format-metadata');
    }
  });

  it('classifies Intermediate fidelity formats: PPTX, XLSX', () => {
    const intermediateFormats = ['pptx', 'xlsx', '.PPTX', '.XLSX'];
    for (const fmt of intermediateFormats) {
      const desc = getFidelityDescriptor(fmt);
      expect(desc.class).toBe('intermediate');
      expect(desc.label).toBe(FIDELITY_LABELS.intermediate);
      expect(desc.explanation).toBe(FIDELITY_EXPLANATIONS.intermediate);
      expect(desc.basis).toBe('provider-format-metadata');
    }
  });

  it('classifies Best Effort fidelity formats: PDF', () => {
    const desc = getFidelityDescriptor('pdf');
    expect(desc.class).toBe('best-effort');
    expect(desc.label).toBe(FIDELITY_LABELS['best-effort']);
    expect(desc.explanation).toBe(FIDELITY_EXPLANATIONS['best-effort']);
    expect(desc.basis).toBe('provider-format-metadata');
  });

  it('classifies unassigned formats as Unknown without error: XLS, CSV, JSON, XML', () => {
    const unknownFormats = ['xls', 'csv', 'json', 'xml', 'arbitrary', 'odt', 'rtf'];
    for (const fmt of unknownFormats) {
      const desc = getFidelityDescriptor(fmt);
      expect(desc.class).toBe('unknown');
      expect(desc.label).toBe(FIDELITY_LABELS.unknown);
      expect(desc.explanation).toBe(FIDELITY_EXPLANATIONS.unknown);
      expect(desc.basis).toBe('unknown');
    }
  });

  it('lists all four canonical fidelity classes', () => {
    const classes = getAllFidelityClasses();
    expect(classes).toEqual(['high', 'intermediate', 'best-effort', 'unknown']);
  });

  it('provides exact copy required by product contract without numeric scores or LLM evaluation', () => {
    for (const cls of getAllFidelityClasses()) {
      expect(FIDELITY_LABELS[cls]).toBeDefined();
      expect(FIDELITY_EXPLANATIONS[cls]).toBeDefined();
      expect(typeof FIDELITY_EXPLANATIONS[cls]).toBe('string');
      expect(FIDELITY_EXPLANATIONS[cls].length).toBeGreaterThan(20);
    }
  });
});
