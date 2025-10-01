import { Router } from '@express';
import { asyncHandler } from '@middlewares';

const routerBase = Router();

routerBase.get(
  '/echo',
  asyncHandler(async (req, res) => {
    res.json({ method: req.method, ok: true });
  })
);

export { routerBase };
