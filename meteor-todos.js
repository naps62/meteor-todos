Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  Meteor.subscribe("tasks");

  Template.task.helpers({
    isOwner: function() {
      return this.owner === Meteor.userId();
    }
  });

  Template.body.helpers({
    tasks: function() {
      var query = {};
      if (Session.get("hideCompleted")) {
        query.checked = { $ne: true };
      }

      return Tasks.find(query, { sort: { createdAt: -1 } })
    },

    hideCompleted: function() {
      return Session.get("hideCompleted");
    },

    incompleteCount: function() {
      return Tasks.find({ checked: { $ne: true } }).count();
    }
  });

  Template.body.events({
    "submit .new-task": function(event) {
      var text = event.target.text.value;

      Meteor.call("addTask", text);

      event.target.text.value = "";

      return false;
    },

    "click .toggle-checked": function() {
      Meteor.call("setChecked", this._id, !this.checked);
    },

    "click .delete": function() {
      Meteor.call("deleteTask", this._id);
    },

    "change .hide-completed input": function(event) {
      Session.set("hideCompleted", event.target.checked);
    },

    "click .toggle-private": function() {
      Meteor.call("setPrivate", this._id, !this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addTask: function(text) {
    if (!Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      owner: Meteor.userId(),
      username: Meteor.user().username,
      createdAt: new Date()
    });
  },

  deleteTask: function(taskId) {
    var task = Tasks.findOne(taskId);
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },

  setChecked: function(taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked } });
  },

  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});

if (Meteor.isServer) {
  Meteor.publish("tasks", function() {
    return Tasks.find({
      $or: [
      { private: { $ne: true } },
      { owner: this.userId }
      ]
    });
  })
}
