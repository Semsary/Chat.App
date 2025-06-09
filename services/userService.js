import UserModal from "../models/userModel.js";
import bcrypt from "bcryptjs";
import {
  deleteOne,
  updateOne,
  createOne,
  deleteOneParam,
  getOne,
  updateOneBlock,
  getAll,
} from "../services/handler.js";
import asyncHandler from "express-async-handler";

export const getUsers = getAll(UserModal);
export const createUser = createOne(UserModal);
export const getUserById = getOne(UserModal);
export const deleteUser = deleteOneParam(UserModal);
export const updateUserBlock = updateOneBlock(UserModal);

export const updateUser = updateOne(UserModal);

export const changePassword = async (req, res, next) => {
  try {
    const doc = await UserModal.findOneAndUpdate(
      { _id: req.params.id }, // Use an object with `_id`
      { password: await bcrypt.hash(req.body.password, 10) },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(
        new ApiError(`No document found with that id => ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      status: "success",
      data: doc,
    });
  } catch (error) {
    next(error); // Pass errors to your error-handling middleware
  }
};

export const getLoggedInUser = asyncHandler(async (req, res, next) => {
  req.params.id = req.user.id;
  next();
} );


export const updateLogedUser = asyncHandler(async (req, res, next) => {
  const user = await UserModal.findByIdAndUpdate(req.user.id,{
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
  },
  {
    new: true,
  }
  );

  res.status(200).json({
    status: "success",
    data: user,
  });

});