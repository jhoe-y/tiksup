// const { authClient } = require('../services/GrpcService');
const axios = require('axios');
const { registerUserSchema, loginUserSchema } = require('../schemas/UserSchema');

const registerUser = async (req, res) => {
  const { first_name, username, password } = req.body;

   const { error } = registerUserSchema.validate({ first_name, username, password });

  if (error) {
    return res.status(400).json({ 
      error: error.details[0].message.replace(/"/g, '') 
    });
  }
  try {
    const endpointURL = `${process.env.WORKER_URL}/api/register`;
    const request = {
    first_name: first_name,
    username: username,
    password: password
    };
    const response = await axios.post(endpointURL, request);

    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).json(err.response.data);
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body; 
  const { error } = loginUserSchema.validate({ username, password });

  if (error) {
    return res.status(400).send(`Error de validación: ${error.details[0].message}`);
  }
  try {
    const endpointURL = `${process.env.WORKER_URL}/api/login`;

    const request = {
        username: username,
        password: password
    };

    const response = await axios.post(endpointURL, request);
    
    res.json(response.data);
  } catch (err) {
    if (err.response.status === 401){
      return res.status(401).json(err.response.data);
    }
    return res.status(500).json({ error: "Something wrong" });
  }
};


module.exports = { registerUser, loginUser };