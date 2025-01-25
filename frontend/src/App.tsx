import * as React from "react"
import { useState } from "react"
import TestInputs from "./components/TestInputs"
import TopBar from "./components/TopBar"
import { API_ENDPOINTS } from "./constants"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import Results from "./components/Results"
import { Stack, Typography } from "@mui/material"
import { Dataset, Organism } from "./models"
import { getDatasets, getOrganisms } from "./apis"
import { validateData } from "./utils"

function App() {

  const [data, setData] = useState(undefined as any)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null as string | null)
  const [organisms, setOrganisms] = useState(null as Organism[] | null)
  const [datasets, setDatasets] = useState(null as Dataset[] | null)


  React.useEffect(() => {
    (async () => {
      try {
        const orgs = await getOrganisms()
        if (orgs?.length > 0) {
          setOrganisms(orgs)
        }
      }
      catch {
      }

      try {
        const dsets = await getDatasets()
        if (dsets?.length > 0) {
          setDatasets(dsets)
        }
      }
      catch {
      }
    })()
  }, [])

  const onRunTest = async (payload: any) => {

    setIsLoading(true)
    setError(null)

    // Retrieve the data from the server
    try {

      const response = await fetch(API_ENDPOINTS.overrepr_test, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(res => res.json())

      if (response.error !== undefined) {
        throw new Error(response.error)
      }

      const valid = validateData(response)

      if (!valid) {
        throw new Error("Error occurred while fetching data. Please try again.")
      }

      setData(response)
    }
    catch (error: any) {
      setError(error.toString())
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack>
        <TopBar />
        <TestInputs onRunTest={onRunTest} isLoading={isLoading} onReset={() => {
          setData(undefined)
          setError(null)
          setIsLoading(false)
        }}
          datasets={datasets}
          orgs={organisms} />
      </Stack>
      {
        error !== null &&
        <Alert variant="outlined" severity="error">
          {error}
        </Alert>
      }
      {
        isLoading &&
        <Stack style={{ paddingTop: "50px" }} alignItems={'center'} spacing={2}><CircularProgress /><Typography>Running Overrepresentation Test</Typography></Stack>
      }
      {
        !isLoading && !error && <Results data={data} />
      }
    </Stack>
  )
}

export default App