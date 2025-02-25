export const getGeneMappings = async (payload: any): Promise<string[]> => {
    
    const response = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL ?? ''}/gene_mappings`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    return await response.json()
}