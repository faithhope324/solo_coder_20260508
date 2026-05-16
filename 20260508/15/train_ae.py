import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
import os

def build_autoencoder(input_shape=(28, 28, 1), latent_dim=2):
    inputs = layers.Input(shape=input_shape)
    
    x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(inputs)
    x = layers.MaxPooling2D((2, 2), padding='same')(x)
    x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = layers.MaxPooling2D((2, 2), padding='same')(x)
    x = layers.Flatten()(x)
    x = layers.Dense(128, activation='relu')(x)
    
    z_mean = layers.Dense(latent_dim, name='z_mean')(x)
    
    encoder = models.Model(inputs, z_mean, name='encoder')
    
    latent_inputs = layers.Input(shape=(latent_dim,))
    x = layers.Dense(7 * 7 * 64, activation='relu')(latent_inputs)
    x = layers.Reshape((7, 7, 64))(x)
    x = layers.Conv2DTranspose(64, (3, 3), activation='relu', padding='same')(x)
    x = layers.UpSampling2D((2, 2))(x)
    x = layers.Conv2DTranspose(32, (3, 3), activation='relu', padding='same')(x)
    x = layers.UpSampling2D((2, 2))(x)
    outputs = layers.Conv2DTranspose(1, (3, 3), activation='sigmoid', padding='same')(x)
    
    decoder = models.Model(latent_inputs, outputs, name='decoder')
    
    autoencoder = models.Model(inputs, decoder(encoder(inputs)), name='autoencoder')
    
    return autoencoder, encoder, decoder

def load_mnist_data():
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0
    
    x_train = np.expand_dims(x_train, axis=-1)
    x_test = np.expand_dims(x_test, axis=-1)
    
    return (x_train, y_train), (x_test, y_test)

def train_model():
    print("Loading MNIST data...")
    (x_train, y_train), (x_test, y_test) = load_mnist_data()
    
    print("Building autoencoder...")
    autoencoder, encoder, decoder = build_autoencoder()
    
    autoencoder.compile(optimizer='adam', loss='binary_crossentropy')
    
    autoencoder.summary()
    
    print("\nTraining autoencoder...")
    history = autoencoder.fit(
        x_train, x_train,
        epochs=30,
        batch_size=128,
        shuffle=True,
        validation_split=0.1
    )
    
    print("\nSaving models...")
    if not os.path.exists('models'):
        os.makedirs('models')
    
    encoder.save('models/encoder.keras')
    decoder.save('models/decoder.keras')
    autoencoder.save('models/autoencoder.keras')
    
    print("\nEncoding test set...")
    encoded_test = encoder.predict(x_test, verbose=1)
    
    print("\nSaving encoded data and labels...")
    np.save('models/encoded_test.npy', encoded_test)
    np.save('models/labels_test.npy', y_test)
    np.save('models/test_images.npy', (x_test * 255).astype(np.uint8))
    
    print("\nDone! Models and encoded data saved in 'models/' directory.")
    print(f"Test set encoded shape: {encoded_test.shape}")

if __name__ == '__main__':
    train_model()
