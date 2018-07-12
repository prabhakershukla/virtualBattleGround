const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const authenticate = require('../controls/authenticate');
const FUNC = require('../controls/functions');
const router = express.Router();


//authentication kick 
router.use(authenticate.kick);


//--------multer storage defination----------------------------------
const imageStorage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null,'./public/matchImages/'+ req.body.m_id);
    },
    filename : (req, file, cb) =>{
        let nameFile = req.data._user.email + path.extname(file.originalname);
        req.data.imageAddress = '/matchImages/'+ req.body.m_id + '/' + nameFile;
        console.log(nameFile);
        cb(null, nameFile );
    }
});
const imageUpload = multer({
    storage : imageStorage
}).single('image');


// database models
const User = require('../models/user');
const Game = require('../models/game');
const Match = require('../models/match');



//match info route
router.get('/:id', (req, res) => {

    Match.findById(req.params.id)
        .populate('challenged challenger game chatroom')
        .exec((err, match) => {
            if (err) console.log(err);
            let isChallenger = false;
            let contactReferance = '';
            if (req.data._user._id.equals(match.challenger._id)) {
                isChallenger = true;
            }
            let ur = isChallenger ? match.challenged : match.challenger;
            let challengerStatus = isChallenger ? 1 : 0;
            console.log(ur);
            ur.games.forEach(g => {
                if (match.game._id.equals(g._id)) {
                    console.log('matched!');
                    contactReferance = g.contact_string;
                }
            });

            res.render('match', {
                gameName: match.game.name,
                c_ref: contactReferance,
                matchId: match._id,
                challenger: match.challenger.full_name,
                c_id: match.challenger._id,
                x_id: req.data._user._id,
                chatId: match.chatroom._id,
                challenged: match.challenged.full_name,
                time: match.date,
                bet: match.balance,
                sender: req.data._user.full_name,
                state: match.state,
                isChallenger: challengerStatus
            })

        });
});

//-------------------------match functions-----------------------------------------------
// admitting defeat
router.post('/admitDefeate', (req, res) => {
    console.log(req.body);
    if(req.body.is_c == 0){//if challenger wins
        Match.findByIdAndUpdate(req.body.m_id,{$set:{state: 2}},(err,m)=> {
            console.log(m);
            let gain = FUNC.calculateReward(m.balance);
            User.findByIdAndUpdate(m.challenger, {$inc: {balance : gain.m_bp, withdrawable_bp: gain.m_bp, total_bp_win : gain.m_bp, leader_point : gain.m_lp, total_win: 1}})
            .exec((err, s)=> {
                console.log(gain);
            });
            res.redirect('/dashboard');
        });
    }
    else {//if challenged wins
        Match.findByIdAndUpdate(req.body.m_id,{$set:{state: 3}},(err,m)=> {
            console.log(m);
            let gain = FUNC.calculateReward(m.balance);
            User.findByIdAndUpdate(m.challenged, {$inc: {balance : gain.m_bp, withdrawable_bp: gain.m_bp, total_bp_win : gain.m_bp, leader_point : gain.m_lp, total_win: 1}})
            .exec((err, s)=> {
                console.log(gain);
            });
            res.redirect('/dashboard');
        });
    }
       
});
//claiming victory
router.post('/claimVectory',imageUpload, (req, res) => {
    if(req.body.is_c == 1){
        Match.findByIdAndUpdate(req.body.m_id,{$set:{state: 4, challenger_evidance: req.data.imageAddress, challenger_evidance_state: true }},(err,m)=> {
            console.log(m);
            res.redirect('/dashboard');
        });
    }
    else {
        Match.findByIdAndUpdate(req.body.m_id,{$set:{state: 4, challenged_evidance: req.data.imageAddress , challenged_evidance_state: true }},(err,m)=> {
            res.redirect('/dashboard');
        }); 
    }
    
})



module.exports = router;