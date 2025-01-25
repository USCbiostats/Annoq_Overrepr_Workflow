import { Dataset, Organism } from "./models"

export const getOrganisms = async (): Promise<Organism[]> => {
    const response = await fetch('https://pantherdb.org/services/oai/pantherdb/supportedgenomes')
    return (await response.json())?.search?.output?.genomes?.genome
}

export const getDatasets = async (): Promise<Dataset[]> => {
    const response = await fetch('https://pantherdb.org/services/oai/pantherdb/supportedannotdatasets')
    return (await response.json())?.search?.annotation_data_sets?.annotation_data_type
}