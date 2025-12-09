import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.activations import sigmoid, tanh

class LSTMCell:
    def __init__(self, input_size, hidden_size, init_scale=0.01):
        self.input_size = input_size
        self.hidden_size = hidden_size

        self.Wf = np.random.randn(input_size, hidden_size) * init_scale
        self.Wi = np.random.randn(input_size, hidden_size) * init_scale
        self.Wc = np.random.randn(input_size, hidden_size) * init_scale
        self.Wo = np.random.randn(input_size, hidden_size) * init_scale

        self.Uf = np.random.randn(hidden_size, hidden_size) * init_scale
        self.Ui = np.random.randn(hidden_size, hidden_size) * init_scale
        self.Uc = np.random.randn(hidden_size, hidden_size) * init_scale
        self.Uo = np.random.randn(hidden_size, hidden_size) * init_scale

        self.bf = np.zeros((1, hidden_size))
        self.bi = np.zeros((1, hidden_size))
        self.bc = np.zeros((1, hidden_size))
        self.bo = np.zeros((1, hidden_size))

        self.cache = {}

    def forward(self, x, h_prev, c_prev):
        f = sigmoid(np.dot(x, self.Wf) + np.dot(h_prev, self.Uf) + self.bf)
        i = sigmoid(np.dot(x, self.Wi) + np.dot(h_prev, self.Ui) + self.bi)
        g = tanh(np.dot(x, self.Wc) + np.dot(h_prev, self.Uc) + self.bc)
        o = sigmoid(np.dot(x, self.Wo) + np.dot(h_prev, self.Uo) + self.bo)

        c_next = f * c_prev + i * g
        h_next = o * tanh(c_next)

        self.cache = {
            'x': x, 'h_prev': h_prev, 'c_prev': c_prev,
            'f': f, 'i': i, 'g': g, 'o': o,
            'c_next': c_next, 'h_next': h_next
        }

        return h_next, c_next

    def backward(self, dh_next, dc_next):
        x = self.cache['x']
        h_prev = self.cache['h_prev']
        c_prev = self.cache['c_prev']
        f = self.cache['f']
        i = self.cache['i']
        g = self.cache['g']
        o = self.cache['o']
        c_next = self.cache['c_next']

        do = dh_next * tanh(c_next)
        do_input = do * o * (1 - o)

        dc = dc_next + dh_next * o * (1 - tanh(c_next) ** 2)

        df = dc * c_prev
        df_input = df * f * (1 - f)

        di = dc * g
        di_input = di * i * (1 - i)

        dg = dc * i
        dg_input = dg * (1 - g ** 2)

        dWf = np.dot(x.T, df_input)
        dUf = np.dot(h_prev.T, df_input)
        dbf = np.sum(df_input, axis=0, keepdims=True)

        dWi = np.dot(x.T, di_input)
        dUi = np.dot(h_prev.T, di_input)
        dbi = np.sum(di_input, axis=0, keepdims=True)

        dWc = np.dot(x.T, dg_input)
        dUc = np.dot(h_prev.T, dg_input)
        dbc = np.sum(dg_input, axis=0, keepdims=True)

        dWo = np.dot(x.T, do_input)
        dUo = np.dot(h_prev.T, do_input)
        dbo = np.sum(do_input, axis=0, keepdims=True)

        dx = (np.dot(df_input, self.Wf.T) +
              np.dot(di_input, self.Wi.T) +
              np.dot(dg_input, self.Wc.T) +
              np.dot(do_input, self.Wo.T))

        dh_prev = (np.dot(df_input, self.Uf.T) +
                   np.dot(di_input, self.Ui.T) +
                   np.dot(dg_input, self.Uc.T) +
                   np.dot(do_input, self.Uo.T))

        dc_prev = dc * f

        grads = {
            'Wf': dWf, 'Uf': dUf, 'bf': dbf,
            'Wi': dWi, 'Ui': dUi, 'bi': dbi,
            'Wc': dWc, 'Uc': dUc, 'bc': dbc,
            'Wo': dWo, 'Uo': dUo, 'bo': dbo
        }

        return dx, dh_prev, dc_prev, grads

class LSTM:
    def __init__(self, input_size, hidden_size, output_size,
                 num_layers=1, learning_rate=0.001):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        self.num_layers = num_layers

        from models.optimizer import Adam

        self.cells = []
        for layer in range(num_layers):
            if layer == 0:
                cell = LSTMCell(input_size, hidden_size)
            else:
                cell = LSTMCell(hidden_size, hidden_size)
            self.cells.append(cell)

        self.Wy = np.random.randn(hidden_size, output_size) * 0.01
        self.by = np.zeros((1, output_size))

        self.optimizer = Adam(learning_rate=learning_rate)

        print(f"✅ LSTM создана: {num_layers} слоев, {hidden_size} hidden units")

    def forward(self, X, return_sequences=False):
        batch_size, seq_length, _ = X.shape

        h = [np.zeros((batch_size, self.hidden_size)) for _ in range(self.num_layers)]
        c = [np.zeros((batch_size, self.hidden_size)) for _ in range(self.num_layers)]

        all_h = [[] for _ in range(self.num_layers)]
        all_c = [[] for _ in range(self.num_layers)]

        outputs = []

        for t in range(seq_length):
            x = X[:, t, :]

            for layer in range(self.num_layers):
                h[layer], c[layer] = self.cells[layer].forward(x, h[layer], c[layer])
                all_h[layer].append(h[layer])
                all_c[layer].append(c[layer])
                x = h[layer]

            y = np.dot(h[-1], self.Wy) + self.by
            outputs.append(y)

        self.all_h = all_h
        self.all_c = all_c
        self.X = X

        outputs = np.array(outputs)
        outputs = np.swapaxes(outputs, 0, 1)

        if return_sequences:
            return outputs
        else:
            return outputs[:, -1, :]

    def backward(self, y_true, y_pred):
        from utils.losses import mse_loss, mse_loss_derivative

        batch_size, seq_length, _ = self.X.shape

        loss = mse_loss(y_true, y_pred)
        dy = mse_loss_derivative(y_true, y_pred)

        dWy = np.dot(self.all_h[-1][-1].T, dy)
        dby = np.sum(dy, axis=0, keepdims=True)

        dh_next = [np.zeros((batch_size, self.hidden_size)) for _ in range(self.num_layers)]
        dc_next = [np.zeros((batch_size, self.hidden_size)) for _ in range(self.num_layers)]

        dh_next[-1] = np.dot(dy, self.Wy.T)

        all_grads = [{key: np.zeros_like(getattr(cell, key))
                     for key in ['Wf', 'Uf', 'bf', 'Wi', 'Ui', 'bi',
                                'Wc', 'Uc', 'bc', 'Wo', 'Uo', 'bo']}
                    for cell in self.cells]

        for t in reversed(range(seq_length)):
            for layer in reversed(range(self.num_layers)):
                dx, dh_prev, dc_prev, grads = self.cells[layer].backward(
                    dh_next[layer], dc_next[layer]
                )

                for key in grads:
                    all_grads[layer][key] += grads[key]

                dh_next[layer] = dh_prev
                dc_next[layer] = dc_prev

        for layer in range(self.num_layers):
            params = {
                'Wf': self.cells[layer].Wf, 'Uf': self.cells[layer].Uf, 'bf': self.cells[layer].bf,
                'Wi': self.cells[layer].Wi, 'Ui': self.cells[layer].Ui, 'bi': self.cells[layer].bi,
                'Wc': self.cells[layer].Wc, 'Uc': self.cells[layer].Uc, 'bc': self.cells[layer].bc,
                'Wo': self.cells[layer].Wo, 'Uo': self.cells[layer].Uo, 'bo': self.cells[layer].bo
            }

            # Create a unique optimizer instance for each layer to avoid shape conflicts
            # Use layer-specific keys by prefixing with layer index
            layer_params = {f'{layer}_{key}': params[key] for key in params}
            layer_grads = {f'{layer}_{key}': all_grads[layer][key] for key in all_grads[layer]}
            
            updated_layer_params = self.optimizer.update(layer_params, layer_grads)
            
            # Extract updated params back
            updated_params = {key: updated_layer_params[f'{layer}_{key}'] for key in params}

            for key in params:
                setattr(self.cells[layer], key, updated_params[key])

        # Use unique keys for output layer to avoid conflicts
        params_out = {'output_Wy': self.Wy, 'output_by': self.by}
        grads_out = {'output_Wy': dWy, 'output_by': dby}
        updated_params_out = self.optimizer.update(params_out, grads_out)
        
        # Extract back
        self.Wy = updated_params_out['output_Wy']
        self.by = updated_params_out['output_by']

        return loss

    def train_step(self, X, y):
        y_pred = self.forward(X, return_sequences=False)
        loss = self.backward(y, y_pred)
        return loss, y_pred

    def predict(self, X):
        return self.forward(X, return_sequences=False)
