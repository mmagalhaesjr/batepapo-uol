import express from "express";
import cors from "cors"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
import joi from 'joi'
import dayjs from "dayjs";

dotenv.config()

const app = express();
app.use(cors());
app.use(express.json());

const PORTA = 5000;

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;


try {
    await mongoClient.connect()
    db = mongoClient.db();
    console.log('Conectado ao banco de dados')
} catch {
    console.log('Erro ao conectar com o servidor')
}

app.post('/participants', async (req, res) => {
    const user = req.body
    const userSchema = joi.object({
        name: joi.string()
            .min(1)
            .required(),
    })
    const validacao = userSchema.validate(user)
    if (validacao.error) {
        return res.sendStatus(422)
    }
    try {
        const resposta = await db.collection("participants").findOne({ name: user.name })
        if (resposta) {
            return res.sendStatus(409)
        }
        await db.collection("participants").insertOne({ name: user.name, lastStatus: Date.now() })

        await db.collection("messages").insertOne({
            from: user.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format("hh:mm:ss")
        })

        res.sendStatus(201)

    } catch {
        res.sendStatus(500)
    }

})

app.get('/participants', async(req, res) => {
    try{
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    }catch{
        res.sendStatus(500)
    }
})

app.post('/messages', (req, res) => {

})

app.get('/messages', async(req, res) => {
    const mensagens = await db.collection("messages").find().toArray()
    res.send(mensagens)
})

app.post('/status', (req, res) => {

})


app.listen(PORTA, () => {
    console.log(`*****Rodando na porta ${PORTA}*****`)
})