/**
 * SC2 Parser - Common StarCraft 2 parsing utilities
 * Provides XML parsing and binary data reading utilities
 */

/**
 * SC2Parser class
 * Common parsing utilities for StarCraft 2 map files
 */
export class SC2Parser {
  /**
   * Parse XML data from buffer
   * SC2 uses XML for metadata and configuration files
   *
   * @param buffer - ArrayBuffer containing XML data
   * @returns Parsed XML Document
   */
  public parseXML(buffer: ArrayBuffer): Document {
    const decoder = new TextDecoder('utf-8');
    const xmlString = decoder.decode(buffer);
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml');
  }

  /**
   * Extract text content from XML node by tag name
   *
   * @param doc - Parsed XML Document
   * @param tagName - XML tag name to search for
   * @returns Text content or null if not found
   */
  public getTextContent(doc: Document, tagName: string): string | null {
    const element = doc.getElementsByTagName(tagName)[0];
    return element?.textContent || null;
  }

  /**
   * Extract text content with default value
   *
   * @param doc - Parsed XML Document
   * @param tagName - XML tag name to search for
   * @param defaultValue - Default value if not found
   * @returns Text content or default value
   */
  public getTextContentWithDefault(doc: Document, tagName: string, defaultValue: string): string {
    return this.getTextContent(doc, tagName) ?? defaultValue;
  }

  /**
   * Extract numeric value from XML node
   *
   * @param doc - Parsed XML Document
   * @param tagName - XML tag name to search for
   * @param defaultValue - Default value if not found or invalid
   * @returns Numeric value or default
   */
  public getNumericContent(doc: Document, tagName: string, defaultValue: number): number {
    const text = this.getTextContent(doc, tagName);
    if (!text) return defaultValue;

    const value = parseInt(text, 10);
    return isNaN(value) ? defaultValue : value;
  }

  /**
   * Create DataView for binary data reading
   *
   * @param buffer - ArrayBuffer to wrap
   * @returns DataView instance
   */
  public createDataView(buffer: ArrayBuffer): DataView {
    return new DataView(buffer);
  }

  /**
   * Check if buffer is valid XML
   *
   * @param buffer - ArrayBuffer to check
   * @returns True if buffer contains valid XML
   */
  public isValidXML(buffer: ArrayBuffer): boolean {
    try {
      const doc = this.parseXML(buffer);
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      return !parserError;
    } catch {
      return false;
    }
  }
}
