/**
 * Funny loading messages for map preview generation
 * Inspired by Discord's humorous loading states
 */

export const FUNNY_LOADING_MESSAGES = [
  'Summoning ancient map spirits...',
  'Decoding arcane MPQ runes...',
  'Extracting compressed knowledge...',
  'Negotiating with ZLIB wizards...',
  'Decompressing magical archives...',
  'Parsing Warcraft III hieroglyphics...',
  'Convincing pixels to arrange themselves...',
  'Reading tea leaves from TGA files...',
  'Consulting the Oracle of Previews...',
  'Bribing the LZMA compression gods...',
  'Downloading more RAM... just kidding',
  'Reversing the polarity of the MPQ flux...',
  'Reticulating splines...',
  'Performing forbidden map rituals...',
  'Asking nicely for the preview data...',
  'Teaching textures to pose for photos...',
  'Calibrating the thumbnail generator...',
  'Convincing bytes to cooperate...',
  'Translating binary to pretty pictures...',
  'Waking up sleepy map archives...',
  'Finding Waldo... I mean, the preview file...',
  'Untangling compressed data streams...',
  'Warming up the pixel painter...',
  'Coaxing shy previews out of hiding...',
  'Performing digital archaeology...',
  'Decrypting campaign secrets...',
  'Assembling map fragments...',
  'Inflating deflated data...',
  'Chanting hex codes at the archive...',
  'Persuading stubborn file headers...',
  'Brewing a potion of decompression...',
  'Sacrificing a stack overflow to the code gods...',
  'Unzipping the unzippable...',
  'Downloading the internet... wait, wrong task',
  'Asking the block table for directions...',
  'Mapping the unmappable...',
  'Rendering the unrenderable...',
  'Converting 1s and 0s to art...',
  'Dusting off ancient campaign files...',
  'Negotiating with nested MPQ archives...',
];

/**
 * Get a random funny loading message
 */
export function getRandomLoadingMessage(): string {
  return FUNNY_LOADING_MESSAGES[Math.floor(Math.random() * FUNNY_LOADING_MESSAGES.length)] || '';
}

/**
 * Get a unique loading message (cycles through all before repeating)
 */
export class LoadingMessageGenerator {
  private usedMessages = new Set<string>();
  private availableMessages = [...FUNNY_LOADING_MESSAGES];

  public getNext(): string {
    // If we've used all messages, reset
    if (this.availableMessages.length === 0) {
      this.usedMessages.clear();
      this.availableMessages = [...FUNNY_LOADING_MESSAGES];
    }

    // Pick a random message from available pool
    const index = Math.floor(Math.random() * this.availableMessages.length);
    const message = this.availableMessages[index] || '';

    // Remove from available and add to used
    this.availableMessages.splice(index, 1);
    this.usedMessages.add(message);

    return message;
  }

  public reset(): void {
    this.usedMessages.clear();
    this.availableMessages = [...FUNNY_LOADING_MESSAGES];
  }
}
