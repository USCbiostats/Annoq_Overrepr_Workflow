export const process_rsids = (idsText: string): Array<string> => {
    // The ids can be separated by commas, spaces or new lines.
    // We will split the text by commas, spaces and new lines.
    // Then we will filter out the empty strings.
    // Finally we will return the unique ids.

    const ids = idsText.split(/[\s,]+/).filter(id => id !== '');
    return [...new Set(ids)];
}