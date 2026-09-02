import { useState, useEffect } from "react"
import { ProfessorLogin } from "@/components/professor/ProfessorLogin"
import { ProfessorDashboard } from "@/components/professor/ProfessorDashboard"

const PROFESSOR_CODE = import.meta.env.VITE_PROFESSOR_CODE || "PROFESSOR"
const STORAGE_KEY = "writeit_professor_auth"

const Professor = () => {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      setAuthenticated(true)
    }
  }, [])

  const handleLogin = (code: string): boolean => {
    if (code.toUpperCase() === PROFESSOR_CODE.toUpperCase()) {
      localStorage.setItem(STORAGE_KEY, "true")
      setAuthenticated(true)
      return true
    }
    return false
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuthenticated(false)
  }

  if (!authenticated) {
    return <ProfessorLogin onLogin={handleLogin} />
  }

  return <ProfessorDashboard onLogout={handleLogout} />
}

export default Professor
