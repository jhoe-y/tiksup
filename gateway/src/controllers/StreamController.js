import { producer } from '../config/kafka.js'
import { streamDataSchema } from '../schemas/StreamDataSchema.js'
import { validateToken } from '../config/jwt.js'
import 'dotenv/config'

export const postUserMovieData = async (req, res) => {
  try {
    const { movie_id, watching_time, watching_repeat, data, next } = req.body

    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer'))
      return res.status(401).json({ error: 'Token not provided' })

    const token = authHeader.substring(7)
    const decodedToken = validateToken(token)
    if (decodedToken === null)
      return res.status(401).json({ error: 'Invalid token' })

    const { error, value } = streamDataSchema.validate({
      user_id: decodedToken.user_id,
      movie_id,
      watching_time,
      watching_repeat,
      data,
      next
    })

    if (error) {
      return res.status(400).json({
        serror: error.details[0].message.replace(/"/g, '')
      })
    }

    let preferences = {
      genre_score: [],
      protagonist_score: { name: "", score: 0.0 },
      director_score: { name: "", score: 0.0 }
    };

    data.genre.forEach(genre => {
      preferences.genre_score.push({ name: genre, score: calculateScore(watching_time, watching_repeat) })
    })

    preferences.protagonist_score.name = data.protagonist
    preferences.protagonist_score.score = calculateScore(watching_time, watching_repeat)

    preferences.director_score.name = data.director
    preferences.director_score.score = calculateScore(watching_time, watching_repeat)

    const mensajeJson = {
      user_id: decodedToken.user_id,
      movie_id: value.movie_id,
      watching_time: value.watching_time,
      watching_repeat: value.watching_repeat,
      preferences,
      next
    }

    const mensajeString = JSON.stringify(mensajeJson)
    await producer.send({
      topic: process.env.KAFKA_TOPIC,
      messages: [{ value: mensajeString }]
    })

    res.status(200).json({ message: 'Message sent to Kafka successfully' })
  } catch (error) {
    console.error('Error sending message to Kafka:', error)
    return res.status(500).json({ error: 'Error sending message to Kafka' })
  }
}

const calculateScore = (watching_time, watching_repeat) => {
  let score = 0
  if (watching_time >= 15) {
    score += 1.0
  } else if (watching_time >= 10) {
    score += 0.5
  } else if (watching_time < 5) {
    score -= 1.0
  } else {
    score -= 0.5
  }

  if (watching_repeat > 1) {
    score += 0.5 * (watching_repeat - 1)
  }

  return score
}
