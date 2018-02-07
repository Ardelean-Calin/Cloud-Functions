"use strict";

var _extends2 = require("babel-runtime/helpers/extends");

var _extends3 = _interopRequireDefault(_extends2);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const functions = require("firebase-functions");
const firebase = require("firebase-admin");

const firebaseApp = firebase.initializeApp(functions.config().firebase);

exports.notifyNews = functions.database.ref("news/").onWrite((() => {
  var _ref = (0, _asyncToGenerator3.default)(function* (event) {
    let snapshot = event.data;
    let news = snapshot.val();
    let payload = {
      notification: {
        title: "Știre nouă de la Bosch",
        body: news.text,
        click_action: "https://ardelean-calin.github.io/",
        icon: "https://proxy.duckduckgo.com/iu/?u=http%3A%2F%2Fi.imgur.com%2Fpb0iavG.jpg&f=1"
      }
    };

    let users = yield firebaseApp.database().ref("users/").once("value");
    users.forEach(function (user) {
      let token = user.val().notificationToken;
      // This is a promise. I don't really need to wait for it to fulfill
      firebaseApp.messaging().sendToDevice(token, payload);
    });
  });

  return function (_x) {
    return _ref.apply(this, arguments);
  };
})());

exports.refreshToBeReviewed = functions.https.onRequest((() => {
  var _ref2 = (0, _asyncToGenerator3.default)(function* (req, res) {
    console.log("Filtering review list");
    let subjects = yield firebaseApp.database().ref("discipline").once("value");

    let users = yield firebaseApp.database().ref("users").once("value");

    users.forEach(function (user) {
      let toReview = user.val().toReview;
      Object.keys(toReview).map(function (key) {
        let temp = {};
        let startDate = getStartDate(key, subjects);
        if (startDate <= new Date().getTime() && new Date().getTime() - startDate < 1000 * 60 * 60 * 24 * 14) {
          temp[key] = true;
        } else {
          // console.log("False: ", startDate, key);
          temp[key] = false;
        }

        if (toReview[key] != temp[key]) firebaseApp.database().ref("users/" + user.key + "/toReview/").update((0, _extends3.default)({}, temp));
      });
    });

    res.status(200).send("Update successful.");
  });

  return function (_x2, _x3) {
    return _ref2.apply(this, arguments);
  };
})());

function getStartDate(ID, subjects) {
  let startDate = null;

  subjects.forEach(subject => {
    let cursuri = subject.val().cursuri;
    let seminarii = subject.val().seminarii;
    let laboratoare = subject.val().laboratoare;

    if (Object.keys(cursuri).includes(ID)) {
      startDate = cursuri[ID].dateStart;
      return true;
    }
    if (Object.keys(seminarii).includes(ID)) {
      startDate = seminarii[ID].dateStart;
      return true;
    }
    if (Object.keys(laboratoare).includes(ID)) {
      startDate = laboratoare[ID].dateStart;
      return true;
    }
  });

  return startDate;
}

exports.createAccount = functions.auth.user().onCreate((() => {
  var _ref3 = (0, _asyncToGenerator3.default)(function* (event) {
    const user = event.data;

    let snapshot = null;

    snapshot = yield firebaseApp.database().ref("discipline").once("value");

    let toBeReviewed = {};
    snapshot.forEach(function (disciplina) {
      let cursuri = disciplina.child("cursuri");
      let seminarii = disciplina.child("seminarii");
      let laboratoare = disciplina.child("laboratoare");

      cursuri.forEach(function (curs) {
        let id = curs.key;
        if (curs.val().dateStart <= new Date().getTime()) toBeReviewed[id] = true;else toBeReviewed[id] = false;
      });

      seminarii.forEach(function (seminar) {
        let id = seminar.key;
        if (seminar.val().dateStart <= new Date().getTime()) toBeReviewed[id] = true;else toBeReviewed[id] = false;
      });

      laboratoare.forEach(function (laborator) {
        let id = laborator.key;
        if (laborator.val().dateStart <= new Date().getTime()) toBeReviewed[id] = true;else toBeReviewed[id] = false;
      });
    });

    return firebaseApp.database().ref("users/" + user.uid).update({
      email: user.email,
      toReview: toBeReviewed
    });
  });

  return function (_x4) {
    return _ref3.apply(this, arguments);
  };
})());
