function my_function () {
    app.commands.executeCommandById("workspace:toggle-pin");
    console.log("Note file pinned.");
    return "";
}
module.exports = my_function;