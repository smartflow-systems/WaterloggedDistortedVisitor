async function main() {
  await replit.init();

  // Once initialized, show the #buttons container and hide the loading screen
  document.getElementById("buttons").style.display = "block";
  document.getElementById("loading").style.display = "none";

  // Event Listeners

  // Create a directory/folder named 'test' at root level when #create_test_dir is clicked
  document
    .getElementById("create_test_dir")
    .addEventListener("click", async () => {
      await replit.fs.createDir("test");

      // Show a confirmation
      await replit.messages.showConfirm("Folder Created");
    });

  // Create afile named 'test-file.txt' at root level containing 'example content' when #touch_test_file is clicked
  document
    .getElementById("touch_text_file")
    .addEventListener("click", async () => {
      await replit.fs.writeFile("test-file.txt", "example content");

      // Show a confirmation
      await replit.messages.showConfirm("File Created");
    });

  // Read all the files & folders in the Repl's file system at root level when #ls_a is clicked
  document.getElementById("ls_a").addEventListener("click", async () => {
    const { children } = await replit.fs.readDir(".");

    // Show the files and folders in #file_folder_list
    document.getElementById("file_folder_list").innerHTML = "";
    for (const child of children) {
      const li = document.createElement("li");
      li.innerText = child.filename;
      document.getElementById("file_folder_list").appendChild(li);
    }
  });
}

window.addEventListener("load", main);
