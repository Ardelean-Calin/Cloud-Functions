const functions = require("firebase-functions");
const firebase = require("firebase-admin");

const firebaseApp = firebase.initializeApp(functions.config().firebase);

exports.notifyNews = functions.database.ref("news/").onWrite(async event => {
  let snapshot = event.data;
  let news = snapshot.val();
  let payload = {
    notification: {
      title: "Știre nouă de la Bosch",
      body: news.text,
      click_action: "https://ardelean-calin.github.io/",
      icon:
        "https://proxy.duckduckgo.com/iu/?u=http%3A%2F%2Fi.imgur.com%2Fpb0iavG.jpg&f=1"
    }
  };

  let users = await firebaseApp
    .database()
    .ref("users/")
    .once("value");
  users.forEach(user => {
    let token = user.val().notificationToken;
    // This is a promise. I don't really need to wait for it to fulfill
    firebaseApp.messaging().sendToDevice(token, payload);
  });
});

exports.refreshToBeReviewed = functions.https.onRequest(async (req, res) => {
  console.log("Filtering review list");
  let subjects = await firebaseApp
    .database()
    .ref("discipline")
    .once("value");

  let users = await firebaseApp
    .database()
    .ref("users")
    .once("value");

  users.forEach(user => {
    let toReview = user.val().toReview;
    Object.keys(toReview).map(key => {
      let temp = {};
      let startDate = getStartDate(key, subjects);
      if (
        startDate <= new Date().getTime() &&
        new Date().getTime() - startDate < 1000 * 60 * 60 * 24 * 14
      ) {
        temp[key] = true;
      } else {
        // console.log("False: ", startDate, key);
        temp[key] = false;
      }

      if (toReview[key] != temp[key])
        firebaseApp
          .database()
          .ref("users/" + user.key + "/toReview/")
          .update({
            ...temp
          });
    });
  });

  res.status(200).send("Update successful.");
});

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

exports.createAccount = functions.auth.user().onCreate(async event => {
  const user = event.data;

  let snapshot = null;

  snapshot = await firebaseApp
    .database()
    .ref("discipline")
    .once("value");

  let toBeReviewed = {};
  snapshot.forEach(disciplina => {
    let cursuri = disciplina.child("cursuri");
    let seminarii = disciplina.child("seminarii");
    let laboratoare = disciplina.child("laboratoare");

    cursuri.forEach(curs => {
      let id = curs.key;
      if (curs.val().dateStart <= new Date().getTime()) toBeReviewed[id] = true;
      else toBeReviewed[id] = false;
    });

    seminarii.forEach(seminar => {
      let id = seminar.key;
      if (seminar.val().dateStart <= new Date().getTime())
        toBeReviewed[id] = true;
      else toBeReviewed[id] = false;
    });

    laboratoare.forEach(laborator => {
      let id = laborator.key;
      if (laborator.val().dateStart <= new Date().getTime())
        toBeReviewed[id] = true;
      else toBeReviewed[id] = false;
    });
  });

  return firebaseApp
    .database()
    .ref("users/" + user.uid)
    .update({
      email: user.email,
      toReview: toBeReviewed
    });
});
