const id = "0200543a-bc4a-4b2c-8a7e-d7254aa5805b";
fetch(`http://localhost:3000/api/client/invitations/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    media: {
      HOME_PHOTO: "https://example.com/test.webp"
    }
  })
}).then(res => res.json()).then(console.log).catch(console.error);
