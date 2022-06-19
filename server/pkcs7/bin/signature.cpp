// Copyright (C) 2003-2020, Foxit Software Inc..
// All Rights Reserved.
//
// http://www.foxitsoftware.com
//
// The following code is copyrighted and contains proprietary information and trade secrets of Foxit Software Inc..
// You cannot distribute any part of Foxit PDF SDK to any third party or general public,
// unless there is a separate license agreement with Foxit Software Inc. which explicitly grants you such rights.
//
// This file contains an example to demonstrate how to use Foxit PDF SDK to add, sign and verify signature
// in PDF document.
//
// NOTE: before using this demo, user should ensure that openssl environment has been prepared:
// a. user should ensure all the openssl header files included by "#include" can be found. (In Windows, User can
//    change project setting "VC++ Directories" -> "Include Directories" or directly change the path
//    used in "#include".)
// b. user should ensure openssl library has been put in the specified path and can be linked to.
//   1. For Windows,
//       Please search "libeay32.lib" in this file to check the specified path. Or user can directly
//       change the path used to link to "libeay32.lib". If use dynamic library of openssl, user may
//       need to put dll library of openssl to the folder where ".exe" file is generated before running demo.
//   2. For Linux and Mac, user should put the "libssl.a" and "libcrypto.a"
//      in the directory "../../../lib".

// Include header files.
#include <iostream>
#include <time.h>
#if defined(_WIN32) || defined(_WIN64)
#include<direct.h>
#else
#include <sys/stat.h>
#endif

// Include Foxit SDK header files.
#if defined(_WIN32) || defined(_WIN64)
#include <Windows.h>
#endif  // defined(_WIN32) || defined(_WIN64)




using namespace std;

// Include openssl header files
#include "openssl/rsa.h"
#include "openssl/evp.h"
#include "openssl/objects.h"
#include "openssl/x509.h"
#include "openssl/err.h"
#include "openssl/pem.h"
#include "openssl/ssl.h"
#include "openssl/pkcs12.h"
#include "openssl/rand.h"
#include "openssl/pkcs7.h"


#if !defined(WIN32) && !defined(_WIN64)
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>
#endif

#ifdef __cplusplus 
extern "C"
#endif 
FILE* __cdecl __iob_func(unsigned i) {
	return __acrt_iob_func(i);
}

#if defined(WIN32) || defined(_WIN64)
#include "openssl/applink.c"
#pragma  comment(lib,"libeay32.lib")
#pragma  comment(lib, "legacy_stdio_definitions.lib ")
#endif


#define FREE_CERT_KEY if(pkey)\
                        EVP_PKEY_free(pkey);\
                      if(x509)\
                        X509_free(x509);\
                      if(ca)\
                        sk_X509_free(ca);\

void InitializeOpenssl() {
	/* Just load the crypto library error strings,
	* SSL_load_error_strings() loads the crypto AND the SSL ones */
	/* SSL_load_error_strings();*/
	ERR_load_crypto_strings();
	OpenSSL_add_all_algorithms();
	OpenSSL_add_all_ciphers();
	OpenSSL_add_all_digests();
}

bool ParseP12File(const char* cert_file_path, std::string cert_file_password,
	EVP_PKEY** pkey, X509** x509, STACK_OF(X509)** ca) {
	FILE* file = NULL;
#if defined(_WIN32) || defined(_WIN64)
	file = fopen(cert_file_path, "rb");
#else
	file = fopen(String::FromUnicode(cert_file_path), "rb");
#endif  // defined(_WIN32) || defined(_WIN64)
	if (!file) {
		return false;
	}

	PKCS12* pkcs12 = d2i_PKCS12_fp(file, NULL);
	fclose(file);
	if (!pkcs12) {
		return false;
	}

	if (!PKCS12_parse(pkcs12, (const char*)cert_file_password.c_str(), pkey, x509, ca)) {
		return false;
	}

	PKCS12_free(pkcs12);
	if (!pkey)
		return false;
	return true;
}

unsigned char* PKCS7Sign(const char* cert_file_path, std::string cert_file_password,
	void* plain_text, int size, int& signed_data_size, bool detached,int hashAlgorithm = 48) {
	PKCS7* p7 = NULL;
	EVP_PKEY* pkey = NULL;
	X509* x509 = NULL;
	STACK_OF(X509)* ca = NULL;
	if (!ParseP12File(cert_file_path, cert_file_password.c_str(), &pkey, &x509, &ca))
		return NULL;

	p7 = PKCS7_new();
	PKCS7_set_type(p7, NID_pkcs7_signed);
	PKCS7_content_new(p7, NID_pkcs7_data);

	const EVP_MD*md = EVP_sha1();
	if (detached) {
		PKCS7_ctrl(p7, PKCS7_OP_SET_DETACHED_SIGNATURE, 1, NULL);
		switch (hashAlgorithm) {
		case 48:
			md = EVP_sha1();
			break;
		case 49:
			md = EVP_sha256();
			break;
		case 50:
			md = EVP_sha384();
			break;
		};
	}

	PKCS7_SIGNER_INFO* signer_info = PKCS7_add_signature(p7, x509, pkey, md);
	PKCS7_add_certificate(p7, x509);

	for (int i = 0; i < sk_num(CHECKED_STACK_OF(X509, ca)); i++)
		PKCS7_add_certificate(p7, (X509*)sk_value(CHECKED_STACK_OF(X509, ca), i));

	// Set source data to BIO.
	BIO* p7bio = PKCS7_dataInit(p7, NULL);
	BIO_write(p7bio, plain_text, size);
	PKCS7_dataFinal(p7, p7bio);

	FREE_CERT_KEY;
	BIO_free_all(p7bio);
	// Get signed data.
	unsigned long der_length = i2d_PKCS7(p7, NULL);
	unsigned char* der = reinterpret_cast<unsigned char*>(malloc(der_length));
	memset(der, 0, der_length);
	unsigned char* der_temp = der;
	i2d_PKCS7(p7, &der_temp);
	PKCS7_free(p7);
	signed_data_size = der_length;
	return (unsigned char*)der;
}

bool PKCS7VerifySignature(void* signed_data, int signedSize, void* plain_text, int plainSize) {
	// Retain PKCS7 object from signed data.
	BIO* vin = BIO_new_mem_buf((void*)signed_data, signedSize);
	PKCS7* p7 = d2i_PKCS7_bio(vin, NULL);
	STACK_OF(PKCS7_SIGNER_INFO) *sk = PKCS7_get_signer_info(p7);
	int sign_count = sk_PKCS7_SIGNER_INFO_num(sk);

	int length = 0;
	int bSigAppr = 0;
	unsigned char *p = NULL;
	for (int i = 0; i < sign_count; i++) {
		PKCS7_SIGNER_INFO* sign_info = sk_PKCS7_SIGNER_INFO_value(sk, i);

		BIO *p7bio = BIO_new_mem_buf((void*)plain_text, plainSize);
		X509 *x509 = PKCS7_cert_from_signer_info(p7, sign_info);
		bSigAppr = PKCS7_verify(p7, NULL, NULL, p7bio, NULL, PKCS7_NOVERIFY|PKCS7_NOSIGS);
		if (1 == bSigAppr)
			bSigAppr = true;
		BIO_free(p7bio);
	}
	PKCS7_free(p7);
	BIO_free(vin);
	return bSigAppr;
}

int main(int argc, char *argv[]) {
	int err_ret = 0;
	if (argc == 1) {
	std:; cout << "arguments Error!!" << endl;
		return 0;
	}
	InitializeOpenssl();

	if (argv[1][0] == 's') {
		/*
			certPath,2
			certPassword, 3
			plainFile 4
			targetFile 5
			detached 6
			hashAlgorithm 7
		*/
		std::cout << argv[4];
		FILE *file = fopen(argv[4], "rb");
		fseek(file, 0L, SEEK_END);
		int size = ftell(file);
		fseek(file, 0L, SEEK_SET);
		void *buffer = malloc(size);
		fread(buffer, 1, size, file);
		fclose(file);

		int signedSize = 0;
		void *signedBuffer = PKCS7Sign(argv[2], std::string(argv[3]), buffer, size, signedSize, argv[6][0] == 'Y', (int)argv[7][0]);
		file = fopen(argv[5], "wb");
		fwrite(signedBuffer, 1, signedSize, file);
		fclose(file);

		free(buffer);
		free(signedBuffer);

		return 0;
	}


	if (argv[1][0] == 'd') {
		/*
			plain file path,2
			output file path,3
			*/
		SHA256_CTX sha_ctx_;
		FILE *file = fopen(argv[2], "rb");
		fseek(file, 0L, SEEK_END);
		int plainLength = ftell(file);
		fseek(file, 0L, SEEK_SET);
		void *plainText = malloc(plainLength);
		fread(plainText, 1, plainLength, file);
		fclose(file);

		SHA256_Init(&sha_ctx_);

		SHA256_Update(&sha_ctx_, plainText, plainLength);

		unsigned char* sha1 = (unsigned char*)OPENSSL_malloc((SHA_DIGEST_LENGTH) * sizeof(unsigned char));
		SHA256_Final(sha1, &sha_ctx_);

		file = fopen(argv[3], "wb");
		fwrite(sha1, 1, SHA_DIGEST_LENGTH, file);
		fclose(file);
		OPENSSL_free(sha1);
		return 0;
	}
	/*
			signed file path,2
			degist file path, 3
			output file path 4
			*/
	FILE *file = fopen(argv[2], "rb");
	fseek(file, 0L, SEEK_END);
	int signedSize = ftell(file);
	fseek(file, 0L, SEEK_SET);
	void *signedBuffer = malloc(signedSize);
	fread(signedBuffer, 1, signedSize, file);
	fclose(file);

	file = fopen(argv[3], "rb");
	fseek(file, 0L, SEEK_END);
	int degistSize = ftell(file);
	fseek(file, 0L, SEEK_SET);
	void *degistBuffer = malloc(degistSize);
	fread(degistBuffer, 1, degistSize, file);
	fclose(file);

	bool ret = PKCS7VerifySignature(signedBuffer, signedSize, degistBuffer, degistSize);

	file = fopen(argv[4], "wb");
	fwrite(ret ? "1024" : "128", 1, ret ? 4 : 3, file);
	fclose(file);


	return err_ret;
}

