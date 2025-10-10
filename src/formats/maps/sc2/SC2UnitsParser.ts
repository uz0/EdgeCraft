/**
 * SC2 Units Parser
 * Parses StarCraft 2 unit placement data
 */

import { SC2Parser } from './SC2Parser';
import type { SC2Unit } from './types';
import type { UnitPlacement } from '../types';

/**
 * SC2UnitsParser class
 * Parses unit placement data from SC2Map files
 */
export class SC2UnitsParser {
  private parser: SC2Parser;

  constructor() {
    this.parser = new SC2Parser();
  }

  /**
   * Parse SC2 units data from buffer
   *
   * @param buffer - ArrayBuffer containing units data
   * @returns Array of SC2Unit objects
   */
  public parse(buffer: ArrayBuffer): SC2Unit[] {
    // Check if buffer contains XML
    if (this.parser.isValidXML(buffer)) {
      return this.parseXMLUnits(buffer);
    }

    // For binary units data, return empty array for now
    // TODO: Implement binary units parsing when format is documented
    return [];
  }

  /**
   * Parse XML-based units data
   *
   * @param _buffer - ArrayBuffer containing XML units data (unused for now)
   * @returns Array of SC2Unit objects
   */
  private parseXMLUnits(_buffer: ArrayBuffer): SC2Unit[] {
    // TODO: Implement XML units parsing when format is documented
    // For now, return empty array
    return [];
  }

  /**
   * Convert SC2Unit array to common UnitPlacement format
   *
   * @param sc2Units - Array of SC2-specific units
   * @returns Array of common UnitPlacement objects
   */
  public toCommonFormat(sc2Units: SC2Unit[]): UnitPlacement[] {
    return sc2Units.map((unit, index) => ({
      id: `sc2_unit_${index}`,
      typeId: unit.type,
      owner: unit.owner,
      position: unit.position,
      rotation: unit.rotation,
      scale: {
        x: unit.scale,
        y: unit.scale,
        z: unit.scale,
      },
    }));
  }
}
