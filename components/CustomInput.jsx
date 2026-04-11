import { View, Text, TextInput } from 'react-native';
import React from 'react';

const CustomInput = ({ value, placeholder, label, handleChange, width }) => {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: width,
        position: 'relative',
        marginBottom: 15
      }}
    >

      {/* LABEL */}
      <Text
        style={{
          position: 'absolute',
          top: -10,
          left: 10,
          backgroundColor: "#fff",
          paddingHorizontal: 4,
          fontSize: 12,
          color: "#555"
        }}
      >
        {label}
      </Text>

      {/* INPUT */}
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder || label}
        placeholderTextColor="#999"
        style={{
          width: "100%",
          elevation: 2,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "#ddd",
          padding: 10,
          backgroundColor: "#fff"
        }}
      />
    </View>
  );
};

export default CustomInput;