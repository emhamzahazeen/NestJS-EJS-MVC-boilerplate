import 'dotenv/config';

import {
    defaultLocale,
    NODE_ENV,
    PORT,
    redisPort,
    redisUrl,
    sessionMaxAge,
    sessionSecret
} from '@config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import connectRedis from 'connect-redis';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import I18n from 'i18n';
import passport from 'passport';
import { join } from 'path';
import redis from 'redis';
import { devConfig } from './app.dev';
import { AppModule } from './app.module';
import { prodConfig } from './app.prod';

import flash = require('connect-flash');

I18n.configure({
    locales: ['en', 'vi', 'jp'],
    directory: `./src/i18n/locales`,
    cookie: 'lang',
    defaultLocale: defaultLocale,
    fallbacks: { nl: defaultLocale },
    syncFiles: true, // comment this on production
    updateFiles: true, // comment this on production
    autoReload: true, // comment this on production
    missingKeyFn: (locale, value) => {
        return value;
    },
});

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.use(cookieParser());

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            validationError: { target: false },
        }),
    );
    app.enable('trust proxy');

    if (NODE_ENV === 'development') {
        devConfig(app);
    } else {
        prodConfig(app);
    }

    app.useStaticAssets(join(__dirname, '..', 'public'), { maxAge: sessionMaxAge });
    app.setBaseViewsDir(join(__dirname, '..', 'views'));

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient({
        host: redisUrl,
        port: redisPort,
    });
    redisClient.on('error', (err) => {
        Logger.log(`Could not establish a connection with redis. ${err}`, 'Bootstrap');
    });
    redisClient.on('connect', () => {
        Logger.log('Connected to redis successfully', 'Bootstrap');
    });

    app.use(
        session({
            store: new RedisStore({ client: redisClient }),
            secret: sessionSecret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // if true only transmit cookie over https
                httpOnly: false, // if true prevent client side JS from reading the cookie
                maxAge: sessionMaxAge, // session max age in miliseconds, restart redis server after change this value
            },
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());
    app.use(I18n.init);
    app.use(flash());

    app.setViewEngine('ejs');

    // handle for multiple language
    app.use((req: Request, res: Response, next: NextFunction) => {
        //set header
        res.header('Access-Control-Allow-Methods', 'POST, GET, PUT');
        res.header('Access-Control-Allow-Headers', '*');

        const lang = req.cookies['lang'] || '';
        if (!lang) {
            I18n.setLocale(defaultLocale);
            res.cookie('lang', defaultLocale, { maxAge: sessionMaxAge });
        } else I18n.setLocale(lang);

        next();
    });

    await app.listen(PORT, '0.0.0.0', () => {
        Logger.log(`Nest listening on http://0.0.0.0:${PORT}`, 'Bootstrap');
    });
}
bootstrap();
