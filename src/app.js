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

app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    } catch {
        res.sendStatus(500)
    }
})

app.post('/messages', async (req, res) => {
    const msg = req.body
    const { user } = req.headers

    const verificarUsuario = await db.collection("participants").findOne({ name: user })
    if (!verificarUsuario) {
        return res.sendStatus(422)
    }

    const msgSchema = joi.object({
        to: joi.string()
            .min(1)
            .required(),
        text: joi.string()
            .min(1)
            .required(),
        type: joi.string().valid('message', 'private_message').required()
    })
    const validacao = msgSchema.validate(msg)
    if (validacao.error) {
        return res.sendStatus(422)
    }

    await db.collection("messages").insertOne({
        from: user,
        to: msg.to,
        text: msg.text,
        type: msg.type,
        time: dayjs().format("hh:mm:ss")
    })
    res.sendStatus(201)


})

app.get('/messages', async (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers

    const msgPublicas = await db.collection('messages').find({ to: 'Todos' }).toArray()

    const msgPrivadas = await db.collection('messages').find({ to: user }).toArray()

    const msgEnviadas = await db.collection('messages').find({ from: user, type: 'private_message' }).toArray()

    const minhasMsg = ([...msgPublicas, ...msgEnviadas, ...msgPrivadas])

    const msgReverse = [...minhasMsg].reverse()
    
    if (limit) {
        const ultimasMsg = msgReverse.slice(0, parseInt(limit))
        return res.send(ultimasMsg)
    }
    
    res.send(minhasMsg)
})

app.post('/status', (req, res) => {

})


app.listen(PORTA, () => {
    console.log(`*****Rodando na porta ${PORTA}*****`)
})