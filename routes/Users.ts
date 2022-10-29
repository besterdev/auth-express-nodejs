import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import _ from 'lodash'

import * as fs from 'fs'
import * as path from 'path'
import * as handlebars from 'handlebars'

const router = express.Router()
const prisma = new PrismaClient()
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')

const verifyToken = require('../middlewares/Auth')

type User = { id: number; email: any; password: string; verified: boolean }

const sendOTPVerificationEmail = async (user: User) => {
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

router.post('/verified', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body

    if (!userId || !otp) {
      res.status(401).json('Empty otp details are not allowed')
      throw Error('Empty otp details are not allowed')
    }

    const userOTP = await prisma.userOTP.findUnique({
      where: {
        userId: userId,
      },
    })

    if (_.size(userOTP) <= 0) {
      res.status(401).json("Account record doesn't exist or has been verified already. Please sign up or login")
      throw Error("Account record doesn't exist or has been verified already. Please sign up or login")
    }

    const expires = dayjs().isAfter(dayjs(userOTP?.expiresAt))

    if (expires) {
      res.status(401).json('Code has expired. Please request, again.')
      throw new Error('Code has expired. Please request, again.')
    }

    const compareOTP = await bcrypt.compare(otp, userOTP?.otp)

    if (!compareOTP) {
      res.status(401).json('Invalid code passed. Check your index.')
      throw new Error('Invalid code passed. Check your index.')
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        verified: true,
      },
    })

    await prisma.userOTP.deleteMany({
      where: {
        userId: userId,
      },
    })

    res.status(401).json({
      message: 'verify otp success ✅',
    })
  } catch (error) {
    console.log(error)
  }
})

module.exports = router
