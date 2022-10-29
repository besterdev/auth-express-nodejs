import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import * as fs from 'fs'
import * as path from 'path'
import * as handlebars from 'handlebars'

const router = express.Router()
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')

const sendOTPVerificationEmail = async (user: any) => {
  const filePath = path.join(__dirname, '../emails/verification.html')
  const source = fs.readFileSync(filePath, 'utf-8').toString()
  const template = handlebars.compile(source)

  const transporter = await nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'thawatchai.krai@gmail.com',
      pass: 'msqnekplcrjsfzyq',
    },
  })

  const otp = await `${Math.floor(1000 + Math.random() * 9000)}`
  const replacements = {
    otp: otp,
  }
  const htmlToSend = template(replacements)
  const mailOptions = {
    from: 'thawatchai.krai@gmail.com',
    to: user.email,
    subject: 'Verify Your Email',
    html: htmlToSend,
  }

  const hashOTP = await bcrypt.hash(otp, 10)

  await prisma.userOTP.create({
    data: {
      otp: hashOTP,
      expiresAt: dayjs().add(5, 'm').format(),
      userId: user.id,
    },
  })

  transporter.sendMail(mailOptions, function (err: any) {
    if (err) {
      console.log('Error Occurs', err)
    } else {
      console.log('Email send')
    }
  })
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    })

    if (user) res.status(401).json('username already exist, please login')

    const hash = await bcrypt.hashSync(password, 10)
    const newUser = await prisma.user.create({
      data: {
        email: email,
        password: hash,
        verified: false,
      },
    })

    await sendOTPVerificationEmail(newUser)

    res.json({
      message: 'please verification otp email sent 📧',
    })
  } catch (error) {
    console.log(error)
  }
})

module.exports = router
