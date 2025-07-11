package security

import (
	"crypto/x509"
	"encoding/pem"
)

// parseCertificate PEM形式の証明書をパース
func parseCertificate(certPEM []byte) (*pem.Block, []byte) {
	block, rest := pem.Decode(certPEM)
	return block, rest
}

// ParseCertificateFromPEM PEM形式の証明書をx509.Certificateに変換
func ParseCertificateFromPEM(certPEM []byte) (*x509.Certificate, error) {
	block, _ := pem.Decode(certPEM)
	if block == nil || block.Type != "CERTIFICATE" {
		return nil, x509.ErrUnsupportedAlgorithm
	}

	return x509.ParseCertificate(block.Bytes)
}

// ParsePrivateKeyFromPEM PEM形式の秘密鍵をパース
func ParsePrivateKeyFromPEM(keyPEM []byte) (interface{}, error) {
	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, x509.ErrUnsupportedAlgorithm
	}

	switch block.Type {
	case "RSA PRIVATE KEY":
		return x509.ParsePKCS1PrivateKey(block.Bytes)
	case "EC PRIVATE KEY":
		return x509.ParseECPrivateKey(block.Bytes)
	case "PRIVATE KEY":
		return x509.ParsePKCS8PrivateKey(block.Bytes)
	default:
		return nil, x509.ErrUnsupportedAlgorithm
	}
}
