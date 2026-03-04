require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const axios = require("axios")
const { google } = require("googleapis")

const app = express()
app.use(bodyParser.json())

// ================================
// CONFIGURAÇÃO GOOGLE CALENDAR
// ================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
})

const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client
})

// ================================
// WEBHOOK WHATSAPP
// ================================

app.post("/webhook", async (req, res) => {
  try {
    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body

    const from =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from

    if (!message) {
      return res.sendStatus(200)
    }

    // Se a pessoa enviar "agendar"
    if (message.toLowerCase().includes("agendar")) {

      // Criar horário automático (1 hora depois do horário atual)
      const start = new Date()
      start.setHours(start.getHours() + 1)

      const end = new Date(start)
      end.setHours(end.getHours() + 1)

      // Criar evento no Google Agenda
      await calendar.events.insert({
        calendarId: "primary",
        resource: {
          summary: "Consulta - CyberAgenda IA",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        }
      })

      // Responder no WhatsApp
      await axios.post(
        `https://graph.facebook.com/v17.0/${process.env.PHONE_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          text: { body: "Agendamento confirmado com sucesso ✅" }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      )
    }

    res.sendStatus(200)

  } catch (error) {
    console.log("Erro:", error)
    res.sendStatus(500)
  }
})
// ================================
// ROTA TESTE
// ================================
app.get("/", (req, res) => {
  res.send("CyberAgenda rodando 🚀")
})

// ================================
// INICIAR SERVIDOR
// ================================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT)
})